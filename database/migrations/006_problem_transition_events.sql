-- ============================================================
-- Migration 006: Problem Transition Events (Promotion/Refactor)
-- ============================================================
-- Adds explicit clinical transition traceability for mutable problems:
-- - promote to chronic / rename diagnosis
-- - discard suspected chronic diagnosis and close thread
-- Keeps the same problem ID while logging from/to state.
-- ============================================================

BEGIN;

DO $$ BEGIN
  CREATE TYPE problem_transition_type AS ENUM (
    'promoted_to_chronic',
    'reclassified',
    'discarded',
    'resolved',
    'reopened',
    'renamed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS problem_transition_events (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              UUID NOT NULL,
  problem_id             UUID NOT NULL,
  patient_id             UUID NOT NULL,

  transition_type        problem_transition_type NOT NULL,

  from_title             VARCHAR(500),
  to_title               VARCHAR(500),
  from_category          problem_category,
  to_category            problem_category,
  from_clinical_status   problem_clinical_status,
  to_clinical_status     problem_clinical_status,

  reason_note            TEXT,
  metadata               JSONB NOT NULL DEFAULT '{}'::jsonb,

  performed_by           UUID NOT NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_transition_problem_scope
    FOREIGN KEY (problem_id, tenant_id, patient_id)
    REFERENCES problems (id, tenant_id, patient_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_problem_transition_problem_date
  ON problem_transition_events (tenant_id, problem_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_problem_transition_patient_date
  ON problem_transition_events (tenant_id, patient_id, created_at DESC);

ALTER TABLE problem_transition_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_problem_transition_events ON problem_transition_events;
CREATE POLICY rls_problem_transition_events ON problem_transition_events
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);

COMMIT;
