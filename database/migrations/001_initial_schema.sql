-- =============================================================================
-- HIPAA-compliant Multi-Tenant Electronic Health Record (EHR) Platform
-- PostgreSQL Schema with Row-Level Security (RLS)
-- Migration: 001_initial_schema.sql
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE user_role AS ENUM ('SuperAdmin', 'TenantOrg', 'TenantProf', 'Paciente');
CREATE TYPE tenant_status AS ENUM ('active', 'suspended', 'inactive');
CREATE TYPE sex_type AS ENUM ('M', 'F', 'X');
CREATE TYPE appointment_status AS ENUM ('scheduled', 'confirmed', 'cancelled', 'completed', 'no_show');
CREATE TYPE problem_status AS ENUM ('active', 'resolved', 'chronic', 'inactive');
CREATE TYPE record_type AS ENUM ('SOAP', 'note', 'procedure', 'lab_result', 'imaging');
CREATE TYPE billing_status AS ENUM ('pending', 'submitted', 'approved', 'rejected', 'paid');

-- =============================================================================
-- GLOBAL TABLES (no tenant_id — shared across all tenants)
-- =============================================================================

-- Tenants (organizations / individual professionals)
CREATE TABLE tenants (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL,
    subdomain       VARCHAR(100) NOT NULL UNIQUE,
    status          tenant_status NOT NULL DEFAULT 'active',
    logo_url        TEXT,
    settings        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenants_subdomain ON tenants (subdomain);

-- Global patients table — NOT tenant-scoped.
-- A patient may be treated by multiple tenants.
CREATE TABLE patients (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Identity (populated & locked by MockRENAPER service)
    dni                 VARCHAR(20) NOT NULL UNIQUE,
    sex                 sex_type NOT NULL,
    first_name          VARCHAR(100) NOT NULL,
    last_name           VARCHAR(100) NOT NULL,
    birth_date          DATE NOT NULL,
    photo_url           TEXT,
    identity_verified   BOOLEAN NOT NULL DEFAULT FALSE,

    -- Contact
    email               VARCHAR(255) UNIQUE,
    phone               VARCHAR(30),
    address             TEXT,
    city                VARCHAR(100),
    province            VARCHAR(100),
    country             VARCHAR(100) DEFAULT 'AR',
    postal_code         VARCHAR(20),

    -- Health insurance / affiliation
    primary_insurance_id    UUID,        -- FK added after health_insurances table
    secondary_insurance_id  UUID,
    insurance_member_number VARCHAR(100),

    -- Auth0 subject (nullable until patient registers)
    auth0_sub           VARCHAR(255) UNIQUE,

    -- Audit
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ
);

CREATE INDEX idx_patients_dni      ON patients (dni);
CREATE INDEX idx_patients_auth0    ON patients (auth0_sub);
CREATE INDEX idx_patients_name     ON patients (last_name, first_name);

-- Health insurance companies (global catalog)
CREATE TABLE health_insurances (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(255) NOT NULL,
    code        VARCHAR(50) UNIQUE,
    country     VARCHAR(100) DEFAULT 'AR',
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add FK after health_insurances is created
ALTER TABLE patients
    ADD CONSTRAINT fk_patients_primary_insurance
        FOREIGN KEY (primary_insurance_id) REFERENCES health_insurances (id),
    ADD CONSTRAINT fk_patients_secondary_insurance
        FOREIGN KEY (secondary_insurance_id) REFERENCES health_insurances (id);

-- Nomenclature / billing codes catalog (global)
CREATE TABLE nomenclatures (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code        VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    system      VARCHAR(100) NOT NULL,   -- e.g. 'AMB', 'PMOE', 'ICD-10'
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (code, system)
);

-- =============================================================================
-- TENANT-SCOPED TABLES (RLS enforced via tenant_id)
-- =============================================================================

-- Users: professionals, org admins, super admins
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    auth0_sub       VARCHAR(255) NOT NULL UNIQUE,
    role            user_role NOT NULL,
    email           VARCHAR(255) NOT NULL,
    first_name      VARCHAR(100),
    last_name       VARCHAR(100),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_tenant    ON users (tenant_id);
CREATE INDEX idx_users_auth0     ON users (auth0_sub);

-- Professional profiles (linked to users with TenantProf role)
CREATE TABLE professionals (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    user_id             UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,

    license_number      VARCHAR(100) NOT NULL,
    specialty           VARCHAR(200),
    bio                 TEXT,
    photo_url           TEXT,
    signature_url       TEXT,
    logo_url            TEXT,

    -- Public schedule config (JSON for flexibility)
    schedule_config     JSONB NOT NULL DEFAULT '{}',
    -- e.g. { "weekdays": [1,2,3,4,5], "slots": [{"start":"09:00","end":"17:00","duration_min":20}] }

    consultation_fee    NUMERIC(10,2),
    is_public           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_professionals_user ON professionals (tenant_id, user_id);

-- Professional ↔ Health insurance accepted
CREATE TABLE professional_insurances (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    professional_id     UUID NOT NULL REFERENCES professionals (id) ON DELETE CASCADE,
    health_insurance_id UUID NOT NULL REFERENCES health_insurances (id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (professional_id, health_insurance_id)
);

-- Schedule blocks (vacations, exceptions)
CREATE TABLE schedule_blocks (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    professional_id UUID NOT NULL REFERENCES professionals (id) ON DELETE CASCADE,
    start_at        TIMESTAMPTZ NOT NULL,
    end_at          TIMESTAMPTZ NOT NULL,
    reason          VARCHAR(255),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_schedule_blocks_tenant_prof ON schedule_blocks (tenant_id, professional_id);

-- Patient ↔ Tenant relationship (captures when a patient first attended a tenant)
CREATE TABLE patient_tenants (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    patient_id      UUID NOT NULL REFERENCES patients (id),
    enrolled_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (tenant_id, patient_id)
);

CREATE INDEX idx_patient_tenants ON patient_tenants (tenant_id, patient_id);

-- Appointments
CREATE TABLE appointments (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    professional_id     UUID NOT NULL REFERENCES professionals (id),
    patient_id          UUID NOT NULL REFERENCES patients (id),

    scheduled_at        TIMESTAMPTZ NOT NULL,
    duration_minutes    INTEGER NOT NULL DEFAULT 20,
    status              appointment_status NOT NULL DEFAULT 'scheduled',
    reason              TEXT,
    notes               TEXT,

    -- FHIR appointment resource ID stored in AWS HealthLake
    fhir_resource_id    VARCHAR(255),

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_appointments_tenant          ON appointments (tenant_id);
CREATE INDEX idx_appointments_professional    ON appointments (tenant_id, professional_id);
CREATE INDEX idx_appointments_patient         ON appointments (tenant_id, patient_id);
CREATE INDEX idx_appointments_scheduled_at    ON appointments (tenant_id, scheduled_at);

-- =============================================================================
-- PROBLEM-ORIENTED MEDICAL RECORD (HCOP)
-- =============================================================================

-- Problems (medical issues / diagnoses)
CREATE TABLE problems (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    patient_id      UUID NOT NULL REFERENCES patients (id),

    title           VARCHAR(500) NOT NULL,
    description     TEXT,
    icd10_code      VARCHAR(20),          -- ICD-10 diagnosis code
    onset_date      DATE,
    resolution_date DATE,
    status          problem_status NOT NULL DEFAULT 'active',

    -- FHIR Condition resource ID stored in AWS HealthLake
    fhir_resource_id VARCHAR(255),

    created_by      UUID NOT NULL REFERENCES users (id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_problems_tenant_patient ON problems (tenant_id, patient_id);

-- Background / Medical history (personal & family)
CREATE TABLE medical_backgrounds (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    patient_id      UUID NOT NULL REFERENCES patients (id),
    type            VARCHAR(50) NOT NULL CHECK (type IN ('personal', 'family', 'surgical', 'allergy', 'medication')),
    description     TEXT NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_by      UUID NOT NULL REFERENCES users (id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_backgrounds_tenant_patient ON medical_backgrounds (tenant_id, patient_id);

-- Clinical Evolutions (SOAP notes linked to a problem)
CREATE TABLE clinical_evolutions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    patient_id      UUID NOT NULL REFERENCES patients (id),
    professional_id UUID NOT NULL REFERENCES professionals (id),
    appointment_id  UUID REFERENCES appointments (id),
    problem_id      UUID REFERENCES problems (id),

    record_type     record_type NOT NULL DEFAULT 'SOAP',
    evolution_date  DATE NOT NULL,
    evolution_time  TIME NOT NULL,

    -- SOAP fields
    subjective      TEXT,               -- S: Motivo de consulta / síntomas referidos
    objective       TEXT,               -- O: Examen físico / hallazgos objetivos
    assessment      TEXT,               -- A: Diagnóstico / impresión clínica
    plan            TEXT,               -- P: Plan terapéutico

    -- Billing
    nomenclature_id UUID REFERENCES nomenclatures (id),
    billing_status  billing_status NOT NULL DEFAULT 'pending',

    -- FHIR IDs stored in AWS HealthLake
    fhir_encounter_id   VARCHAR(255),
    fhir_observation_id VARCHAR(255),

    created_by      UUID NOT NULL REFERENCES users (id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ         -- soft-delete for HIPAA audit trail
);

CREATE INDEX idx_evolutions_tenant_patient ON clinical_evolutions (tenant_id, patient_id);
CREATE INDEX idx_evolutions_professional   ON clinical_evolutions (tenant_id, professional_id);
CREATE INDEX idx_evolutions_appointment    ON clinical_evolutions (appointment_id);
CREATE INDEX idx_evolutions_problem        ON clinical_evolutions (problem_id);

-- Clinical attachments (images / documents stored in AWS S3)
CREATE TABLE clinical_attachments (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    patient_id          UUID NOT NULL REFERENCES patients (id),
    evolution_id        UUID REFERENCES clinical_evolutions (id),

    file_name           VARCHAR(500) NOT NULL,
    mime_type           VARCHAR(100) NOT NULL,
    s3_bucket           VARCHAR(255) NOT NULL,
    s3_key              TEXT NOT NULL,      -- encrypted path
    file_size_bytes     BIGINT,
    description         TEXT,

    uploaded_by         UUID NOT NULL REFERENCES users (id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ
);

CREATE INDEX idx_attachments_tenant_patient ON clinical_attachments (tenant_id, patient_id);
CREATE INDEX idx_attachments_evolution      ON clinical_attachments (evolution_id);

-- Audit log (HIPAA access tracking)
CREATE TABLE audit_logs (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       UUID REFERENCES tenants (id),
    user_id         UUID REFERENCES users (id),
    patient_id      UUID REFERENCES patients (id),
    action          VARCHAR(100) NOT NULL,  -- e.g. 'READ_RECORD', 'UPDATE_EVOLUTION'
    resource_type   VARCHAR(100),
    resource_id     UUID,
    ip_address      INET,
    user_agent      TEXT,
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_tenant     ON audit_logs (tenant_id, created_at DESC);
CREATE INDEX idx_audit_patient    ON audit_logs (patient_id, created_at DESC);
CREATE INDEX idx_audit_user       ON audit_logs (user_id, created_at DESC);

-- =============================================================================
-- ROW-LEVEL SECURITY (RLS)
-- =============================================================================
-- All tenant-scoped tables use the session variable app.current_tenant_id
-- which is set by the NestJS middleware after JWT verification.

-- Helper function to get the current tenant ID safely
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN current_setting('app.current_tenant_id', TRUE)::UUID;
EXCEPTION
    WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Helper function to check if the current role is SuperAdmin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN current_setting('app.user_role', TRUE) = 'SuperAdmin';
EXCEPTION
    WHEN OTHERS THEN RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ---- users ----
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_tenant_isolation ON users
    USING (
        is_super_admin()
        OR tenant_id = current_tenant_id()
    );

-- ---- professionals ----
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;

CREATE POLICY professionals_tenant_isolation ON professionals
    USING (
        is_super_admin()
        OR tenant_id = current_tenant_id()
    );

-- ---- professional_insurances ----
ALTER TABLE professional_insurances ENABLE ROW LEVEL SECURITY;

CREATE POLICY professional_insurances_tenant_isolation ON professional_insurances
    USING (
        is_super_admin()
        OR tenant_id = current_tenant_id()
    );

-- ---- schedule_blocks ----
ALTER TABLE schedule_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY schedule_blocks_tenant_isolation ON schedule_blocks
    USING (
        is_super_admin()
        OR tenant_id = current_tenant_id()
    );

-- ---- patient_tenants ----
ALTER TABLE patient_tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY patient_tenants_isolation ON patient_tenants
    USING (
        is_super_admin()
        OR tenant_id = current_tenant_id()
    );

-- ---- appointments ----
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY appointments_tenant_isolation ON appointments
    USING (
        is_super_admin()
        OR tenant_id = current_tenant_id()
    );

-- ---- problems ----
ALTER TABLE problems ENABLE ROW LEVEL SECURITY;

CREATE POLICY problems_tenant_isolation ON problems
    USING (
        is_super_admin()
        OR tenant_id = current_tenant_id()
    );

-- ---- medical_backgrounds ----
ALTER TABLE medical_backgrounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY backgrounds_tenant_isolation ON medical_backgrounds
    USING (
        is_super_admin()
        OR tenant_id = current_tenant_id()
    );

-- ---- clinical_evolutions ----
ALTER TABLE clinical_evolutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY evolutions_tenant_isolation ON clinical_evolutions
    USING (
        is_super_admin()
        OR tenant_id = current_tenant_id()
    );

-- ---- clinical_attachments ----
ALTER TABLE clinical_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY attachments_tenant_isolation ON clinical_attachments
    USING (
        is_super_admin()
        OR tenant_id = current_tenant_id()
    );

-- ---- audit_logs ----
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_tenant_isolation ON audit_logs
    USING (
        is_super_admin()
        OR tenant_id = current_tenant_id()
    );

-- =============================================================================
-- PATIENT TABLE — special RLS (global table, access controlled via patient_tenants)
-- =============================================================================
-- patients is global (no tenant_id), so RLS works differently:
-- A user can SELECT a patient only if their current tenant has a patient_tenants record,
-- OR if the query comes from a patient themselves (auth0_sub match).

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY patients_tenant_access ON patients
    FOR SELECT
    USING (
        is_super_admin()
        OR EXISTS (
            SELECT 1 FROM patient_tenants pt
            WHERE pt.patient_id = patients.id
              AND pt.tenant_id = current_tenant_id()
              AND pt.is_active = TRUE
        )
        -- Patient can access their own record via auth0 subject
        OR auth0_sub = current_setting('app.current_user_auth0_sub', TRUE)
    );

-- Only the application's privileged role can INSERT/UPDATE patients
-- (prevents tenants from modifying another tenant's patient records)
CREATE POLICY patients_write_control ON patients
    FOR ALL
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

-- =============================================================================
-- UPDATED_AT triggers
-- =============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_patients_updated_at
    BEFORE UPDATE ON patients
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_professionals_updated_at
    BEFORE UPDATE ON professionals
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_problems_updated_at
    BEFORE UPDATE ON problems
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_evolutions_updated_at
    BEFORE UPDATE ON clinical_evolutions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- APPLICATION ROLES
-- =============================================================================

-- app_user: used by NestJS at runtime (RLS enforced)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
        CREATE ROLE app_user LOGIN;
    END IF;
END
$$;

GRANT CONNECT ON DATABASE postgres TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- app_superadmin: used for migrations and SuperAdmin operations (bypasses RLS)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_superadmin') THEN
        CREATE ROLE app_superadmin LOGIN BYPASSRLS;
    END IF;
END
$$;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_superadmin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO app_superadmin;
