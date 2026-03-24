-- ============================================================
-- Migration 007: AR Prescription + Digital Signature Compliance
-- ============================================================
-- Leyes objetivo:
--  - 25.649 (Genéricos): DCI obligatoria, marca opcional
--  - 25.506 (Firma Digital): hash y bloqueo inmutable post-firma
--  - 27.553 (Receta Digital): documento validable con QR
--  - 25.326 / HIPAA: payload sensible cifrado en reposo
-- ============================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Vademecum AR (DCI + marca opcional + SNOMED CT AR)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ar_vademecum_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dci_name              VARCHAR(200) NOT NULL,
  brand_name            VARCHAR(200),
  snomed_ct_ar_code     VARCHAR(30)  NOT NULL,
  snomed_display        VARCHAR(300) NOT NULL,
  atc_code              VARCHAR(20),
  active                BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ar_vademecum_dci
  ON ar_vademecum_items (LOWER(dci_name));

CREATE INDEX IF NOT EXISTS idx_ar_vademecum_snomed
  ON ar_vademecum_items (snomed_ct_ar_code);

-- Seed mínimo de referencia (idempotente)
INSERT INTO ar_vademecum_items (dci_name, brand_name, snomed_ct_ar_code, snomed_display, atc_code)
VALUES
  ('Losartan', 'Cozaar', '372733003', 'Losartan potassium (substance)', 'C09CA01'),
  ('Losartan', NULL, '372733003', 'Losartan potassium (substance)', 'C09CA01'),
  ('Metformina', 'Glucophage', '372729009', 'Metformin (substance)', 'A10BA02'),
  ('Metformina', NULL, '372729009', 'Metformin (substance)', 'A10BA02'),
  ('Enalapril', 'Renitec', '386872004', 'Enalapril (substance)', 'C09AA02'),
  ('Enalapril', NULL, '386872004', 'Enalapril (substance)', 'C09AA02')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Prescriptions hardening + signature + digital document
-- ---------------------------------------------------------------------------

ALTER TABLE prescriptions
  ADD COLUMN IF NOT EXISTS dci_name                 VARCHAR(200),
  ADD COLUMN IF NOT EXISTS brand_name               VARCHAR(200),
  ADD COLUMN IF NOT EXISTS snomed_ct_ar_code        VARCHAR(30),
  ADD COLUMN IF NOT EXISTS doctor_license           VARCHAR(50),
  ADD COLUMN IF NOT EXISTS validation_token         UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS qr_validation_url        TEXT,
  ADD COLUMN IF NOT EXISTS digital_document_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS digital_document_hash    VARCHAR(128),
  ADD COLUMN IF NOT EXISTS signed_by                UUID,
  ADD COLUMN IF NOT EXISTS signature_provider       VARCHAR(30),
  ADD COLUMN IF NOT EXISTS pfdr_transaction_id      VARCHAR(120),
  ADD COLUMN IF NOT EXISTS is_locked                BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS prolonged_plan_group_id  UUID,
  ADD COLUMN IF NOT EXISTS installment_number       SMALLINT;

UPDATE prescriptions
SET dci_name = COALESCE(dci_name, drug_name),
    signature_provider = COALESCE(signature_provider, 'local_hash')
WHERE dci_name IS NULL OR signature_provider IS NULL;

ALTER TABLE prescriptions
  ALTER COLUMN dci_name SET NOT NULL,
  ALTER COLUMN validation_token SET NOT NULL,
  ALTER COLUMN signature_provider SET DEFAULT 'local_hash';

CREATE UNIQUE INDEX IF NOT EXISTS uq_prescriptions_validation_token
  ON prescriptions (validation_token);

CREATE INDEX IF NOT EXISTS idx_prescriptions_plan_group
  ON prescriptions (prolonged_plan_group_id, installment_number);

ALTER TABLE prescriptions
  ADD CONSTRAINT chk_prescription_problem_required
    CHECK (problem_id IS NOT NULL)
    NOT VALID;

-- ---------------------------------------------------------------------------
-- Evolution signature (for signed SOAP note)
-- ---------------------------------------------------------------------------

ALTER TABLE clinical_evolutions
  ADD COLUMN IF NOT EXISTS signed_at            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signed_by            UUID,
  ADD COLUMN IF NOT EXISTS signature_hash       VARCHAR(128),
  ADD COLUMN IF NOT EXISTS signature_provider   VARCHAR(30),
  ADD COLUMN IF NOT EXISTS pfdr_transaction_id  VARCHAR(120),
  ADD COLUMN IF NOT EXISTS is_locked            BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE clinical_evolutions
SET signature_provider = COALESCE(signature_provider, 'local_hash')
WHERE signature_provider IS NULL;

ALTER TABLE clinical_evolutions
  ALTER COLUMN signature_provider SET DEFAULT 'local_hash';

-- ---------------------------------------------------------------------------
-- Problem thread signature / immutability
-- ---------------------------------------------------------------------------

ALTER TABLE problems
  ADD COLUMN IF NOT EXISTS thread_signed_at             TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS thread_signed_by             UUID,
  ADD COLUMN IF NOT EXISTS thread_signature_hash        VARCHAR(128),
  ADD COLUMN IF NOT EXISTS thread_signature_provider    VARCHAR(30),
  ADD COLUMN IF NOT EXISTS thread_pfdr_transaction_id   VARCHAR(120),
  ADD COLUMN IF NOT EXISTS is_thread_locked             BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE problems
SET thread_signature_provider = COALESCE(thread_signature_provider, 'local_hash')
WHERE thread_signature_provider IS NULL;

ALTER TABLE problems
  ALTER COLUMN thread_signature_provider SET DEFAULT 'local_hash';

COMMIT;
