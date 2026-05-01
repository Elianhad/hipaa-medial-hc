-- =============================================================================
-- Migration: 004_fhir_persistence_outbox.sql
-- Adds trend scoring and integration outbox triggers for FHIR synchronization.
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE integration_event_status AS ENUM ('pending', 'processing', 'failed', 'completed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

ALTER TABLE clinical_evolutions
  ADD COLUMN IF NOT EXISTS trend_score SMALLINT GENERATED ALWAYS AS (
    CASE trend
      WHEN 'worsening' THEN -1
      WHEN 'stable' THEN 0
      WHEN 'improving' THEN 1
      WHEN 'resolution' THEN 2
      ELSE NULL
    END
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_evolutions_problem_trend_score
  ON clinical_evolutions (tenant_id, problem_id, evolution_date, evolution_time, trend_score)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS integration_outbox (
    id                  BIGSERIAL PRIMARY KEY,
    tenant_id           UUID REFERENCES tenants (id),
    aggregate_type      VARCHAR(50) NOT NULL,
    aggregate_id        UUID NOT NULL,
    event_type          VARCHAR(100) NOT NULL,
    payload             JSONB NOT NULL,
    status              integration_event_status NOT NULL DEFAULT 'pending',
    retry_count         INTEGER NOT NULL DEFAULT 0,
    next_retry_at       TIMESTAMPTZ,
    processed_at        TIMESTAMPTZ,
    last_error          TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (aggregate_type IN ('problem', 'evolution', 'medical_order'))
);

CREATE INDEX IF NOT EXISTS idx_integration_outbox_pending
  ON integration_outbox (status, next_retry_at, created_at);

CREATE INDEX IF NOT EXISTS idx_integration_outbox_aggregate
  ON integration_outbox (aggregate_type, aggregate_id, created_at DESC);

ALTER TABLE integration_outbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY integration_outbox_tenant_isolation ON integration_outbox
  USING (
    is_super_admin()
    OR tenant_id = current_tenant_id()
  );

CREATE OR REPLACE FUNCTION map_problem_clinical_status_to_fhir(status problem_clinical_status)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE status
    WHEN 'recurrent' THEN 'recurrence'
    ELSE status::TEXT
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION enqueue_problem_fhir_sync()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT'
    OR NEW.title IS DISTINCT FROM OLD.title
    OR NEW.snomed_ct_code IS DISTINCT FROM OLD.snomed_ct_code
    OR NEW.icd10_code IS DISTINCT FROM OLD.icd10_code
    OR NEW.category IS DISTINCT FROM OLD.category
    OR NEW.clinical_status IS DISTINCT FROM OLD.clinical_status
    OR NEW.resolution_date IS DISTINCT FROM OLD.resolution_date
    OR NEW.resolution_reason IS DISTINCT FROM OLD.resolution_reason
    OR NEW.closure_summary IS DISTINCT FROM OLD.closure_summary THEN
    INSERT INTO integration_outbox (
      tenant_id,
      aggregate_type,
      aggregate_id,
      event_type,
      payload
    ) VALUES (
      NEW.tenant_id,
      'problem',
      NEW.id,
      CASE WHEN TG_OP = 'INSERT' THEN 'problem.created' ELSE 'problem.updated' END,
      jsonb_build_object(
        'problemId', NEW.id,
        'patientId', NEW.patient_id,
        'tenantId', NEW.tenant_id,
        'title', NEW.title,
        'snomedCode', NEW.snomed_ct_code,
        'icd10Code', NEW.icd10_code,
        'category', NEW.category,
        'clinicalStatus', map_problem_clinical_status_to_fhir(NEW.clinical_status),
        'resolutionDate', NEW.resolution_date,
        'resolutionReason', NEW.resolution_reason,
        'closureSummary', NEW.closure_summary,
        'occurredAt', NOW()
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION enqueue_evolution_fhir_sync()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.problem_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT'
    OR NEW.anamnesis_narrative IS DISTINCT FROM OLD.anamnesis_narrative
    OR NEW.objective_findings IS DISTINCT FROM OLD.objective_findings
    OR NEW.clinical_assessment IS DISTINCT FROM OLD.clinical_assessment
    OR NEW.action_plan IS DISTINCT FROM OLD.action_plan
    OR NEW.trend IS DISTINCT FROM OLD.trend THEN
    INSERT INTO integration_outbox (
      tenant_id,
      aggregate_type,
      aggregate_id,
      event_type,
      payload
    ) VALUES (
      NEW.tenant_id,
      'evolution',
      NEW.id,
      CASE WHEN TG_OP = 'INSERT' THEN 'evolution.created' ELSE 'evolution.updated' END,
      jsonb_build_object(
        'evolutionId', NEW.id,
        'patientId', NEW.patient_id,
        'problemId', NEW.problem_id,
        'professionalId', NEW.professional_id,
        'tenantId', NEW.tenant_id,
        'evolutionDate', (NEW.evolution_date::TEXT || 'T' || NEW.evolution_time::TEXT),
        'subjective', NEW.anamnesis_narrative,
        'objective', NEW.objective_findings,
        'assessment', NEW.clinical_assessment,
        'plan', NEW.action_plan,
        'trend', NEW.trend,
        'trendScore', NEW.trend_score,
        'occurredAt', NOW()
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION enqueue_medical_order_fhir_sync()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT'
    OR NEW.type IS DISTINCT FROM OLD.type
    OR NEW.detail IS DISTINCT FROM OLD.detail
    OR NEW.order_status IS DISTINCT FROM OLD.order_status
    OR NEW.completed_at IS DISTINCT FROM OLD.completed_at
    OR NEW.cancelled_at IS DISTINCT FROM OLD.cancelled_at THEN
    INSERT INTO integration_outbox (
      tenant_id,
      aggregate_type,
      aggregate_id,
      event_type,
      payload
    ) VALUES (
      NEW.tenant_id,
      'medical_order',
      NEW.id,
      CASE WHEN TG_OP = 'INSERT' THEN 'medical_order.created' ELSE 'medical_order.updated' END,
      jsonb_build_object(
        'orderId', NEW.id,
        'patientId', NEW.patient_id,
        'problemId', NEW.problem_id,
        'evolutionId', NEW.evolution_id,
        'professionalId', NEW.ordered_by,
        'tenantId', NEW.tenant_id,
        'orderType', NEW.type,
        'detail', NEW.detail,
        'status', NEW.order_status,
        'completedAt', NEW.completed_at,
        'cancelledAt', NEW.cancelled_at,
        'sourceTable', 'medical_orders',
        'occurredAt', NOW()
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enqueue_problem_fhir_sync ON problems;
CREATE TRIGGER trg_enqueue_problem_fhir_sync
  AFTER INSERT OR UPDATE OF title, snomed_ct_code, icd10_code, category, clinical_status, resolution_date, resolution_reason, closure_summary
  ON problems
  FOR EACH ROW EXECUTE FUNCTION enqueue_problem_fhir_sync();

DROP TRIGGER IF EXISTS trg_enqueue_evolution_fhir_sync ON clinical_evolutions;
CREATE TRIGGER trg_enqueue_evolution_fhir_sync
  AFTER INSERT OR UPDATE OF anamnesis_narrative, objective_findings, clinical_assessment, action_plan, trend
  ON clinical_evolutions
  FOR EACH ROW EXECUTE FUNCTION enqueue_evolution_fhir_sync();

DROP TRIGGER IF EXISTS trg_enqueue_medical_order_fhir_sync ON medical_orders;
CREATE TRIGGER trg_enqueue_medical_order_fhir_sync
  AFTER INSERT OR UPDATE OF type, detail, order_status, completed_at, cancelled_at
  ON medical_orders
  FOR EACH ROW EXECUTE FUNCTION enqueue_medical_order_fhir_sync();
