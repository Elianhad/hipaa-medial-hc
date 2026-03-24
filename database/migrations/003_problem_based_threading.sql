-- =============================================================================
-- Migration: 003_problem_based_threading.sql
-- Evolves the existing HCOP schema toward a problem-based threading model.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE problem_category AS ENUM ('acute', 'chronic', 'symptomatic');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE problem_clinical_status AS ENUM ('active', 'resolved', 'inactive', 'recurrent');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE evolution_trend AS ENUM ('improving', 'stable', 'worsening', 'resolution');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE medical_order_type AS ENUM ('medication', 'laboratory', 'imaging');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE medical_order_status AS ENUM ('draft', 'active', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE problem_resolution_reason AS ENUM ('cured', 'remission', 'controlled', 'diagnostic_error');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- -----------------------------------------------------------------------------
-- Parent entity: problems
-- -----------------------------------------------------------------------------

ALTER TYPE problem_status ADD VALUE IF NOT EXISTS 'recurrent';

ALTER TABLE problems
  ADD COLUMN IF NOT EXISTS snomed_ct_code VARCHAR(32),
  ADD COLUMN IF NOT EXISTS category problem_category,
  ADD COLUMN IF NOT EXISTS clinical_status problem_clinical_status,
  ADD COLUMN IF NOT EXISTS resolution_reason problem_resolution_reason,
  ADD COLUMN IF NOT EXISTS closure_summary TEXT,
  ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES users (id),
  ADD COLUMN IF NOT EXISTS recurrence_of_problem_id UUID REFERENCES problems (id);

UPDATE problems
SET
  category = COALESCE(
    category,
    CASE
      WHEN status = 'chronic' THEN 'chronic'::problem_category
      WHEN icd10_code IS NOT NULL THEN 'acute'::problem_category
      ELSE 'symptomatic'::problem_category
    END
  ),
  clinical_status = COALESCE(
    clinical_status,
    CASE
      WHEN status = 'resolved' THEN 'resolved'::problem_clinical_status
      WHEN status = 'inactive' THEN 'inactive'::problem_clinical_status
      WHEN status = 'recurrent' THEN 'recurrent'::problem_clinical_status
      ELSE 'active'::problem_clinical_status
    END
  );

ALTER TABLE problems
  ALTER COLUMN category SET DEFAULT 'symptomatic',
  ALTER COLUMN clinical_status SET DEFAULT 'active';

ALTER TABLE problems
  ALTER COLUMN category SET NOT NULL,
  ALTER COLUMN clinical_status SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_problems_id_tenant_patient
  ON problems (id, tenant_id, patient_id);

CREATE INDEX IF NOT EXISTS idx_problems_patient_status
  ON problems (tenant_id, patient_id, clinical_status, category, created_at DESC);

ALTER TABLE problems
  ADD CONSTRAINT chk_problems_resolution_date_order
    CHECK (resolution_date IS NULL OR onset_date IS NULL OR resolution_date >= onset_date)
    NOT VALID;

ALTER TABLE problems
  ADD CONSTRAINT chk_problems_resolved_requires_metadata
    CHECK (
      clinical_status NOT IN ('resolved', 'inactive')
      OR resolution_date IS NOT NULL
    )
    NOT VALID;

ALTER TABLE problems
  ADD CONSTRAINT chk_problems_resolution_reason_requires_closed_status
    CHECK (
      resolution_reason IS NULL
      OR clinical_status IN ('resolved', 'inactive')
    )
    NOT VALID;

-- -----------------------------------------------------------------------------
-- Child entity: clinical_evolutions
-- Keeps legacy SOAP fields for compatibility while adding thread-native aliases.
-- -----------------------------------------------------------------------------

ALTER TABLE clinical_evolutions
  ADD COLUMN IF NOT EXISTS anamnesis_narrative TEXT,
  ADD COLUMN IF NOT EXISTS objective_findings TEXT,
  ADD COLUMN IF NOT EXISTS clinical_assessment TEXT,
  ADD COLUMN IF NOT EXISTS action_plan TEXT,
  ADD COLUMN IF NOT EXISTS trend evolution_trend,
  ADD COLUMN IF NOT EXISTS fhir_clinical_impression_id VARCHAR(255);

UPDATE clinical_evolutions
SET
  anamnesis_narrative = COALESCE(anamnesis_narrative, subjective),
  objective_findings = COALESCE(objective_findings, objective),
  clinical_assessment = COALESCE(clinical_assessment, assessment),
  action_plan = COALESCE(action_plan, plan);

CREATE UNIQUE INDEX IF NOT EXISTS uq_evolutions_id_tenant_patient_problem
  ON clinical_evolutions (id, tenant_id, patient_id, problem_id);

CREATE INDEX IF NOT EXISTS idx_evolutions_problem_timeline
  ON clinical_evolutions (tenant_id, problem_id, evolution_date DESC, evolution_time DESC)
  WHERE deleted_at IS NULL;

ALTER TABLE clinical_evolutions
  ADD CONSTRAINT fk_evolutions_problem_scope
    FOREIGN KEY (problem_id, tenant_id, patient_id)
    REFERENCES problems (id, tenant_id, patient_id)
    NOT VALID;

-- -----------------------------------------------------------------------------
-- Orders linked to both the problem thread and the evolution that originated it.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS medical_orders (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id               UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    patient_id              UUID NOT NULL REFERENCES patients (id),
    problem_id              UUID NOT NULL,
    evolution_id            UUID NOT NULL,
    ordered_by              UUID NOT NULL REFERENCES users (id),
    type                    medical_order_type NOT NULL,
    detail                  TEXT NOT NULL,
    order_status            medical_order_status NOT NULL DEFAULT 'active',
    fhir_resource_type      VARCHAR(50),
    fhir_resource_id        VARCHAR(255),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at            TIMESTAMPTZ,
    cancelled_at            TIMESTAMPTZ,
    CONSTRAINT fk_orders_problem_scope
      FOREIGN KEY (problem_id, tenant_id, patient_id)
      REFERENCES problems (id, tenant_id, patient_id),
    CONSTRAINT fk_orders_evolution_scope
      FOREIGN KEY (evolution_id, tenant_id, patient_id, problem_id)
      REFERENCES clinical_evolutions (id, tenant_id, patient_id, problem_id),
    CONSTRAINT chk_orders_completed_consistency
      CHECK (order_status <> 'completed' OR completed_at IS NOT NULL),
    CONSTRAINT chk_orders_cancelled_consistency
      CHECK (order_status <> 'cancelled' OR cancelled_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_medical_orders_problem
  ON medical_orders (tenant_id, problem_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_medical_orders_evolution
  ON medical_orders (tenant_id, evolution_id);

CREATE INDEX IF NOT EXISTS idx_medical_orders_patient_status
  ON medical_orders (tenant_id, patient_id, order_status, type);

ALTER TABLE medical_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY medical_orders_tenant_isolation ON medical_orders
  USING (
    is_super_admin()
    OR tenant_id = current_tenant_id()
  );

CREATE TRIGGER trg_medical_orders_updated_at
  BEFORE UPDATE ON medical_orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();