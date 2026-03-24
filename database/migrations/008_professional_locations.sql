-- Migration: 008_professional_locations
-- Created: 2026-03-23
-- Purpose: Add support for multiple professional locations with individual schedules

BEGIN;

-- Create professional_locations table
CREATE TABLE professional_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Identificación de la locación
    name VARCHAR(255) NOT NULL,
    address VARCHAR(512),
    phone VARCHAR(20),
    
    -- Configuración específica de la locación
    weekly_schedule JSONB DEFAULT '{}'::jsonb,
    appointment_rules JSONB DEFAULT '{}'::jsonb,
    
    -- Main location flag
    is_main_location BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT unique_professional_location_name 
        UNIQUE (professional_id, name)
);

-- Create indexes for faster queries
CREATE INDEX idx_professional_locations_professional_id 
    ON professional_locations(professional_id, is_active);

CREATE INDEX idx_professional_locations_tenant_id 
    ON professional_locations(tenant_id);

-- Migrate existing data: create default location for each professional
-- from their current schedule_config (if any)
INSERT INTO professional_locations (
    professional_id,
    tenant_id,
    name,
    weekly_schedule,
    appointment_rules,
    is_main_location,
    is_active,
    created_at,
    updated_at
)
SELECT 
    p.id,
    p.tenant_id,
    'Consultorio Principal' AS name,
    COALESCE(p.schedule_config, '{}'::jsonb) AS weekly_schedule,
    '{}'::jsonb AS appointment_rules,
    true AS is_main_location,
    true AS is_active,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM professionals p
WHERE p.is_active = true;

COMMIT;
