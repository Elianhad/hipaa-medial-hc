-- =============================================================================
-- Migration: 002_multi_tenant_architecture.sql
-- Adds tenant_type, new user roles, and tenant_memberships table
-- =============================================================================

-- 1. Add tenant_type enum and column on tenants
DO $$ BEGIN
  CREATE TYPE tenant_type AS ENUM ('independent', 'organization');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS type tenant_type NOT NULL DEFAULT 'independent';

-- 2. Extend user_role enum with new values (PostgreSQL requires a workaround)
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'OrgAdmin';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'OrgStaff';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'Professional';

-- 3. Add member_role enum and tenant_memberships table
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

CREATE INDEX IF NOT EXISTS idx_tenant_memberships_tenant ON tenant_memberships(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_memberships_user   ON tenant_memberships(user_id);

-- Row-Level Security for tenant_memberships (same pattern as other tables)
ALTER TABLE tenant_memberships ENABLE ROW LEVEL SECURITY;
