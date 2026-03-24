-- ============================================================
-- Migration 005: Chronic Care Baseline + Prescriptions
-- ============================================================
-- Adds the data model for:
--   1. problem_baselines       — clinical goals, maintenance alerts
--   2. baseline_medications    — active sustaining meds per baseline
--   3. baseline_alerts         — preventive-care intervals
--   4. prescriptions           — structured MedicationRequest records
--   5. adherence_records       — pharmacy / patient-app reports
--   6. Columns on problems     — decompensation_status, fhir_condition_id,
--                                 snomed_code, category (if not from 003)
--   7. Columns on clinical_evolutions — is_fast_track, is_decompensation,
--                                        fast_track_mode
-- Compatible with migration 003/004.  Run in order.
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 0. New ENUM types
-- ─────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE decompensation_status AS ENUM (
    'none',
    'acute_exacerbation',
    'hospitalized',
    'resolved_decompensation'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE fast_track_mode AS ENUM (
    'full_soap',
    'routine_control',
    'decompensation'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE prescription_status AS ENUM (
    'draft',
    'active',
    'completed',
    'cancelled',
    'on_hold',
    'stopped'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE adherence_source AS ENUM (
    'pharmacy_dispense',
    'patient_report',
    'caregiver_report',
    'ehr_sync'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE alert_interval_unit AS ENUM (
    'days',
    'weeks',
    'months',
    'years'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────
-- 1. Extend problems table
--    (category / clinical_status may already exist from 003 —
--     use ADD COLUMN IF NOT EXISTS)
-- ─────────────────────────────────────────────────────────────

ALTER TABLE problems
  ADD COLUMN IF NOT EXISTS snomed_code       VARCHAR(30),
  ADD COLUMN IF NOT EXISTS icd11_code        VARCHAR(20),
  ADD COLUMN IF NOT EXISTS fhir_condition_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS decompensation_status decompensation_status
    NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS decompensation_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS decompensation_resolved_at TIMESTAMPTZ;

-- ─────────────────────────────────────────────────────────────
-- 2. Extend clinical_evolutions table
-- ─────────────────────────────────────────────────────────────

ALTER TABLE clinical_evolutions
  ADD COLUMN IF NOT EXISTS fast_track_mode fast_track_mode
    NOT NULL DEFAULT 'full_soap',
  ADD COLUMN IF NOT EXISTS is_fast_track     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_decompensation BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS no_changes_so     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS auto_assessment   TEXT,
  ADD COLUMN IF NOT EXISTS fhir_clinical_impression_id VARCHAR(100);

-- ─────────────────────────────────────────────────────────────
-- 3. problem_baselines
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS problem_baselines (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID        NOT NULL,
  problem_id        UUID        NOT NULL,
  patient_id        UUID        NOT NULL,

  -- Narrative clinical goals (free text displayed in UI)
  clinical_goals    TEXT[], -- array of goal strings, e.g. {"TA sistólica < 140", "HbA1c < 7%"}

  -- Structured numeric goals (LOINC + threshold)
  goals_structured  JSONB NOT NULL DEFAULT '[]',
  -- [{ "loinc_code": "8480-6", "display": "TA sistólica",
  --    "operator": "<", "target_value": 140, "unit": "mmHg" }]

  -- Lab/vital auto-fetch config: list of LOINC codes to pull automatically
  auto_fetch_loincodes TEXT[] NOT NULL DEFAULT '{}',
  -- e.g. {"8480-6","8462-4","55284-4"}  for HTA

  -- Free-text sustaining treatment narrative (auto-filled from baseline_medications)
  sustaining_treatment_note TEXT,

  -- Version / last clinical review
  reviewed_by       UUID,
  reviewed_at       TIMESTAMPTZ,

  created_by        UUID        NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_baseline_problem  FOREIGN KEY (problem_id)  REFERENCES problems(id)  ON DELETE CASCADE,
  CONSTRAINT uq_one_baseline_per_problem UNIQUE (problem_id)
);

CREATE INDEX IF NOT EXISTS idx_baselines_tenant_patient
  ON problem_baselines (tenant_id, patient_id);

-- RLS — tenant isolation
ALTER TABLE problem_baselines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_problem_baselines ON problem_baselines;
CREATE POLICY rls_problem_baselines ON problem_baselines
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);

-- ─────────────────────────────────────────────────────────────
-- 4. baseline_medications  (sustaining treatment list)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS baseline_medications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baseline_id   UUID NOT NULL,
  tenant_id     UUID NOT NULL,

  drug_name     VARCHAR(300) NOT NULL,
  rxnorm_code   VARCHAR(20),
  dose          VARCHAR(100),           -- "10 mg"
  frequency     VARCHAR(100),           -- "cada 12 h"
  route         VARCHAR(100),           -- "oral"
  started_at    DATE,
  stopped_at    DATE,                   -- NULL = still active
  stop_reason   TEXT,

  fhir_medication_request_id VARCHAR(100),

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_bm_baseline FOREIGN KEY (baseline_id)
    REFERENCES problem_baselines(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_baseline_meds_baseline
  ON baseline_medications (baseline_id);
CREATE INDEX IF NOT EXISTS idx_baseline_meds_tenant
  ON baseline_medications (tenant_id);

ALTER TABLE baseline_medications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_baseline_medications ON baseline_medications;
CREATE POLICY rls_baseline_medications ON baseline_medications
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);

-- ─────────────────────────────────────────────────────────────
-- 5. baseline_alerts  (preventive-care intervals)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS baseline_alerts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baseline_id       UUID NOT NULL,
  tenant_id         UUID NOT NULL,

  alert_type        VARCHAR(50) NOT NULL, -- 'laboratory', 'imaging', 'referral', 'vaccination', 'vital_check'
  description       VARCHAR(500) NOT NULL,
  loinc_code        VARCHAR(20),          -- if lab/vital
  interval_value    SMALLINT NOT NULL,    -- e.g. 3
  interval_unit     alert_interval_unit NOT NULL, -- 'months'
  last_completed_at DATE,
  next_due_at       DATE GENERATED ALWAYS AS (
    CASE interval_unit
      WHEN 'days'   THEN last_completed_at + (interval_value * INTERVAL '1 day')::DATE
      WHEN 'weeks'  THEN last_completed_at + (interval_value * INTERVAL '1 week')::DATE
      WHEN 'months' THEN last_completed_at + (interval_value * INTERVAL '1 month')::DATE
      WHEN 'years'  THEN last_completed_at + (interval_value * INTERVAL '1 year')::DATE
      ELSE NULL
    END
  ) STORED,
  is_overdue        BOOLEAN GENERATED ALWAYS AS (
    last_completed_at IS NOT NULL AND CURRENT_DATE > (
      CASE interval_unit
        WHEN 'days'   THEN last_completed_at + (interval_value * INTERVAL '1 day')::DATE
        WHEN 'weeks'  THEN last_completed_at + (interval_value * INTERVAL '1 week')::DATE
        WHEN 'months' THEN last_completed_at + (interval_value * INTERVAL '1 month')::DATE
        WHEN 'years'  THEN last_completed_at + (interval_value * INTERVAL '1 year')::DATE
        ELSE CURRENT_DATE
      END
    )
  ) STORED,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_ba_baseline FOREIGN KEY (baseline_id)
    REFERENCES problem_baselines(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_baseline_alerts_next_due
  ON baseline_alerts (tenant_id, next_due_at);

ALTER TABLE baseline_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_baseline_alerts ON baseline_alerts;
CREATE POLICY rls_baseline_alerts ON baseline_alerts
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);

-- ─────────────────────────────────────────────────────────────
-- 6. prescriptions  (structured MedicationRequest per visit)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS prescriptions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL,
  patient_id            UUID NOT NULL,
  professional_id       UUID NOT NULL,
  problem_id            UUID,            -- linked problem (reasonCode)
  evolution_id          UUID,            -- linked evolution note
  baseline_id           UUID,            -- if it's a one-click-refill

  drug_name             VARCHAR(300) NOT NULL,
  rxnorm_code           VARCHAR(20),
  snomed_drug_code      VARCHAR(30),

  dose                  VARCHAR(100) NOT NULL,
  frequency             VARCHAR(100) NOT NULL,
  route                 VARCHAR(50)  NOT NULL DEFAULT 'oral',
  duration_days         SMALLINT,       -- NULL = indefinite
  quantity              SMALLINT,
  refills               SMALLINT NOT NULL DEFAULT 0,

  instructions          TEXT,           -- patient instructions
  dispense_as_written   BOOLEAN NOT NULL DEFAULT FALSE,

  status                prescription_status NOT NULL DEFAULT 'active',
  authored_on           DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until           DATE,           -- authored_on + duration_days
  cancelled_at          TIMESTAMPTZ,
  cancel_reason         TEXT,

  -- Digital signature (simplified — hash + professional_id acts as sig)
  signed_at             TIMESTAMPTZ,
  signature_hash        VARCHAR(128),   -- SHA-256 of payload + professional_id

  -- FHIR pointer
  fhir_medication_request_id VARCHAR(100),

  -- One-click refill traceability
  refilled_from_id      UUID REFERENCES prescriptions(id) ON DELETE SET NULL,
  is_one_click_refill   BOOLEAN NOT NULL DEFAULT FALSE,
  refill_days_supply    SMALLINT,       -- 30 / 60 / 90

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_rx_patient   FOREIGN KEY (patient_id)      REFERENCES patients(id),
  CONSTRAINT fk_rx_problem   FOREIGN KEY (problem_id)      REFERENCES problems(id)   ON DELETE SET NULL,
  CONSTRAINT fk_rx_evolution FOREIGN KEY (evolution_id)    REFERENCES clinical_evolutions(id) ON DELETE SET NULL,
  CONSTRAINT fk_rx_baseline  FOREIGN KEY (baseline_id)     REFERENCES problem_baselines(id)   ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_rx_patient       ON prescriptions (tenant_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_rx_problem       ON prescriptions (problem_id) WHERE problem_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rx_status        ON prescriptions (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_rx_authored_on   ON prescriptions (patient_id, authored_on DESC);

ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_prescriptions ON prescriptions;
CREATE POLICY rls_prescriptions ON prescriptions
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);

-- ─────────────────────────────────────────────────────────────
-- 7. adherence_records
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS adherence_records (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL,
  prescription_id   UUID NOT NULL,
  patient_id        UUID NOT NULL,

  report_date       DATE NOT NULL,
  doses_prescribed  SMALLINT NOT NULL,
  doses_taken       SMALLINT NOT NULL,
  adherence_pct     NUMERIC(5,2) GENERATED ALWAYS AS (
    CASE WHEN doses_prescribed > 0
      THEN (doses_taken::NUMERIC / doses_prescribed) * 100
      ELSE 0
    END
  ) STORED,

  source            adherence_source NOT NULL,
  notes             TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_adherence_rx FOREIGN KEY (prescription_id)
    REFERENCES prescriptions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_adherence_prescription
  ON adherence_records (prescription_id, report_date DESC);

ALTER TABLE adherence_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_adherence_records ON adherence_records;
CREATE POLICY rls_adherence_records ON adherence_records
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);

-- ─────────────────────────────────────────────────────────────
-- 8. Outbox triggers for new tables (appended to migration 004)
-- ─────────────────────────────────────────────────────────────

-- Prescription → MedicationRequest sync
CREATE OR REPLACE FUNCTION notify_prescription_fhir_sync()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO integration_outbox (
    aggregate_type, aggregate_id, event_type, payload
  )
  VALUES (
    'prescription',
    NEW.id,
    CASE WHEN TG_OP = 'INSERT' THEN 'prescription.created' ELSE 'prescription.updated' END,
    jsonb_build_object(
      'prescriptionId',   NEW.id,
      'patientId',        NEW.patient_id,
      'problemId',        NEW.problem_id,
      'professionalId',   NEW.professional_id,
      'evolutionId',      NEW.evolution_id,
      'drugName',         NEW.drug_name,
      'rxnormCode',       NEW.rxnorm_code,
      'dose',             NEW.dose,
      'frequency',        NEW.frequency,
      'route',            NEW.route,
      'durationDays',     NEW.duration_days,
      'status',           NEW.status,
      'authoredOn',       NEW.authored_on,
      'refillDaysSupply', NEW.refill_days_supply,
      'isOneClickRefill', NEW.is_one_click_refill,
      'tenantId',         NEW.tenant_id
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enqueue_prescription_fhir_sync ON prescriptions;
CREATE TRIGGER trg_enqueue_prescription_fhir_sync
  AFTER INSERT OR UPDATE OF status, dose, frequency
  ON prescriptions
  FOR EACH ROW EXECUTE FUNCTION notify_prescription_fhir_sync();

-- Decompensation status change → push alert event
CREATE OR REPLACE FUNCTION notify_problem_decompensation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.decompensation_status <> OLD.decompensation_status THEN
    INSERT INTO integration_outbox (
      aggregate_type, aggregate_id, event_type, payload
    )
    VALUES (
      'problem',
      NEW.id,
      CASE
        WHEN NEW.decompensation_status = 'none' THEN 'problem.decompensation_resolved'
        ELSE 'problem.decompensation_started'
      END,
      jsonb_build_object(
        'problemId',             NEW.id,
        'patientId',             NEW.patient_id,
        'decompensationStatus',  NEW.decompensation_status,
        'decompensationStarted', NEW.decompensation_started_at,
        'tenantId',              NEW.tenant_id
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_decompensation ON problems;
CREATE TRIGGER trg_notify_decompensation
  AFTER UPDATE OF decompensation_status
  ON problems
  FOR EACH ROW EXECUTE FUNCTION notify_problem_decompensation();

-- ─────────────────────────────────────────────────────────────
-- 9. Helper view: problem_dashboard_summary
--    Used by the decompensation badge on the dashboard
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW problem_dashboard_summary AS
SELECT
  p.id                       AS problem_id,
  p.tenant_id,
  p.patient_id,
  p.title,
  p.status,
  p.decompensation_status,
  p.decompensation_started_at,

  -- Latest trend from most recent evolution
  (SELECT ce.trend
   FROM clinical_evolutions ce
   WHERE ce.problem_id = p.id
   ORDER BY ce.evolution_date DESC, ce.evolution_time DESC
   LIMIT 1) AS latest_trend,

  -- Latest trend score
  (SELECT ce.trend_score
   FROM clinical_evolutions ce
   WHERE ce.problem_id = p.id
   ORDER BY ce.evolution_date DESC, ce.evolution_time DESC
   LIMIT 1) AS latest_trend_score,

  -- Overdue alerts count
  (SELECT COUNT(*)
   FROM baseline_alerts ba
   JOIN problem_baselines pb ON pb.id = ba.baseline_id
   WHERE pb.problem_id = p.id AND ba.is_overdue = TRUE
  ) AS overdue_alerts_count,

  -- Active prescriptions count
  (SELECT COUNT(*)
   FROM prescriptions rx
   WHERE rx.problem_id = p.id AND rx.status = 'active'
  ) AS active_rx_count,

  -- Latest adherence (last 90 days average)
  (SELECT ROUND(AVG(ar.adherence_pct), 1)
   FROM adherence_records ar
   JOIN prescriptions rx ON rx.id = ar.prescription_id
   WHERE rx.problem_id = p.id
     AND ar.report_date >= CURRENT_DATE - INTERVAL '90 days'
  ) AS adherence_90d_pct,

  -- Is there a baseline?
  EXISTS (
    SELECT 1 FROM problem_baselines pb WHERE pb.problem_id = p.id
  ) AS has_baseline

FROM problems p;

COMMIT;
