-- =============================================================================
-- Seed: 001_demo_data.sql
-- Creates two demo tenants, two users, two professionals and one patient
-- so the public booking pages and dashboards have real data to render.
--
-- UUIDs are hard-coded so re-running the script is idempotent (ON CONFLICT).
-- Run:
--   psql postgresql://app_user:app_password@localhost:5433/hipaa_hce -f 001_demo_data.sql
-- =============================================================================

SET client_encoding TO 'UTF8';

-- -------------------------------------------------------------------------
-- 1. Apply migration 002 if not already applied (adds tenant_type column)
-- -------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE tenant_type AS ENUM ('independent', 'organization');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS type tenant_type NOT NULL DEFAULT 'independent';

DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'OrgAdmin';
EXCEPTION WHEN others THEN null;
END $$;
DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'OrgStaff';
EXCEPTION WHEN others THEN null;
END $$;
DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'Professional';
EXCEPTION WHEN others THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE member_role AS ENUM ('admin', 'staff');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS tenant_memberships (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role        member_role NOT NULL DEFAULT 'staff',
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, user_id)
);

-- -------------------------------------------------------------------------
-- 2. Tenants
-- -------------------------------------------------------------------------
INSERT INTO tenants (id, name, subdomain, type, status, settings) VALUES
  (
    'aaaaaaaa-0001-4000-a000-000000000001',
    'Dr. Juan Fulano — Clínica Médica',
    'drfulano',
    'independent',
    'active',
    '{"specialty":"Clínica Médica","consultationFee":5000}'
  ),
  (
    'aaaaaaaa-0002-4000-a000-000000000002',
    'Clínica Demo Multiespecialidad',
    'clinica-demo',
    'organization',
    'active',
    '{"description":"Centro médico con múltiples especialidades"}'
  )
ON CONFLICT (subdomain) DO UPDATE
  SET name     = EXCLUDED.name,
      type     = EXCLUDED.type,
      settings = EXCLUDED.settings,
      updated_at = NOW();

-- -------------------------------------------------------------------------
-- 3. Users  (auth0_sub uses "demo|" prefix — never matches a real Auth0 user)
-- -------------------------------------------------------------------------
INSERT INTO users (id, tenant_id, auth0_sub, role, email, first_name, last_name) VALUES
  (
    'bbbbbbbb-0001-4000-b000-000000000001',
    'aaaaaaaa-0001-4000-a000-000000000001',
    'demo|professional-drfulano',
    'Professional',
    'drfulano@demo.hipaa-hce.local',
    'Juan',
    'Fulano'
  ),
  (
    'bbbbbbbb-0002-4000-b000-000000000002',
    'aaaaaaaa-0002-4000-a000-000000000002',
    'demo|org-admin-clinica',
    'OrgAdmin',
    'admin@clinica-demo.hipaa-hce.local',
    'María',
    'Ortega'
  ),
  (
    'bbbbbbbb-0003-4000-b000-000000000003',
    'aaaaaaaa-0002-4000-a000-000000000002',
    'demo|org-staff-clinica',
    'OrgStaff',
    'staff@clinica-demo.hipaa-hce.local',
    'Carlos',
    'Pérez'
  )
ON CONFLICT (auth0_sub) DO UPDATE
  SET email      = EXCLUDED.email,
      first_name = EXCLUDED.first_name,
      last_name  = EXCLUDED.last_name,
      updated_at = NOW();

-- -------------------------------------------------------------------------
-- 4. Professionals
-- -------------------------------------------------------------------------

-- Add sisa_verified + professional_type columns if not present (they exist in
-- the entity but may not have been in the initial migration DDL you applied)
ALTER TABLE professionals
  ADD COLUMN IF NOT EXISTS sisa_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS professional_type VARCHAR(100);

INSERT INTO professionals (
  id, tenant_id, user_id, license_number, specialty,
  bio, consultation_fee, is_public, sisa_verified, professional_type
) VALUES
  (
    'cccccccc-0001-4000-c000-000000000001',
    'aaaaaaaa-0001-4000-a000-000000000001',
    'bbbbbbbb-0001-4000-b000-000000000001',
    'MN-123456',
    'Clínica Médica',
    'Médico clínico con más de 15 años de experiencia en atención ambulatoria.',
    5000.00,
    TRUE,
    TRUE,
    'Médico'
  ),
  (
    'cccccccc-0002-4000-c000-000000000002',
    'aaaaaaaa-0002-4000-a000-000000000002',
    'bbbbbbbb-0003-4000-b000-000000000003',
    'MN-654321',
    'Cardiología',
    'Especialista en cardiología intervencionista.',
    7500.00,
    TRUE,
    TRUE,
    'Médico'
  )
ON CONFLICT (tenant_id, user_id) DO UPDATE
  SET specialty         = EXCLUDED.specialty,
      bio               = EXCLUDED.bio,
      consultation_fee  = EXCLUDED.consultation_fee,
      updated_at        = NOW();

-- -------------------------------------------------------------------------
-- 5. Tenant memberships (the org staff professional joined clinica-demo)
-- -------------------------------------------------------------------------
INSERT INTO tenant_memberships (tenant_id, user_id, role) VALUES
  (
    'aaaaaaaa-0002-4000-a000-000000000002',
    'bbbbbbbb-0003-4000-b000-000000000003',
    'staff'
  )
ON CONFLICT (tenant_id, user_id) DO NOTHING;

-- -------------------------------------------------------------------------
-- 6. Demo patient
-- -------------------------------------------------------------------------
INSERT INTO patients (
  id, dni, sex, first_name, last_name, birth_date,
  identity_verified, email, phone, city, province
) VALUES
  (
    'dddddddd-0001-4000-d000-000000000001',
    '30123456',
    'M',
    'Pedro',
    'Paciente',
    '1990-06-15',
    TRUE,
    'pedro.paciente@demo.hipaa-hce.local',
    '1111-2222',
    'Buenos Aires',
    'Buenos Aires'
  )
ON CONFLICT (dni) DO UPDATE
  SET email      = EXCLUDED.email,
      updated_at = NOW();

-- -------------------------------------------------------------------------
-- 7. Link patient to both tenants
-- -------------------------------------------------------------------------
INSERT INTO patient_tenants (tenant_id, patient_id) VALUES
  ('aaaaaaaa-0001-4000-a000-000000000001', 'dddddddd-0001-4000-d000-000000000001'),
  ('aaaaaaaa-0002-4000-a000-000000000002', 'dddddddd-0001-4000-d000-000000000001')
ON CONFLICT (tenant_id, patient_id) DO NOTHING;

-- -------------------------------------------------------------------------
-- 8. Demo appointment (tomorrow at 10:00 AM UTC-3)
-- -------------------------------------------------------------------------
INSERT INTO appointments (
  id, tenant_id, professional_id, patient_id,
  scheduled_at, duration_minutes, status, reason
) VALUES
  (
    'eeeeeeee-0001-4000-e000-000000000001',
    'aaaaaaaa-0001-4000-a000-000000000001',
    'cccccccc-0001-4000-c000-000000000001',
    'dddddddd-0001-4000-d000-000000000001',
    (NOW() + INTERVAL '1 day')::date + TIME '13:00:00',   -- 10:00 AM UTC-3
    20,
    'scheduled',
    'Control anual'
  )
ON CONFLICT (id) DO NOTHING;

-- -------------------------------------------------------------------------
-- Done
-- -------------------------------------------------------------------------
SELECT 'Seed completed successfully' AS result;
