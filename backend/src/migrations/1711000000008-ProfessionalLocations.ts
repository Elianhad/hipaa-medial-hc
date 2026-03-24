import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProfessionalLocations1711000000008 implements MigrationInterface {
    name = 'ProfessionalLocations1711000000008';

    async up(queryRunner: QueryRunner): Promise<void> {
        // Create professional_locations table
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS professional_locations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        name VARCHAR(255) NOT NULL,
        address VARCHAR(512),
        phone VARCHAR(20),
        weekly_schedule JSONB DEFAULT '{}'::jsonb,
        appointment_rules JSONB DEFAULT '{}'::jsonb,
        is_main_location BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_professional_location_name
          UNIQUE (professional_id, name)
      )
    `);

        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_professional_locations_professional_id
        ON professional_locations(professional_id, is_active)
    `);

        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_professional_locations_tenant_id
        ON professional_locations(tenant_id)
    `);

        // Migrate existing data — create default location for each professional
        await queryRunner.query(`
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
      ON CONFLICT (professional_id, name) DO NOTHING
    `);
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `DROP TABLE IF EXISTS professional_locations CASCADE`,
        );
    }
}
