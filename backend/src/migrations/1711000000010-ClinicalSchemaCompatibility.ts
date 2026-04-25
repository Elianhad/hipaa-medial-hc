import { MigrationInterface, QueryRunner } from 'typeorm';

export class ClinicalSchemaCompatibility1711000000010 implements MigrationInterface {
    name = 'ClinicalSchemaCompatibility1711000000010';

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
      ALTER TABLE clinical_evolutions
      ADD COLUMN IF NOT EXISTS fhir_clinical_impression_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS is_fast_track BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS is_decompensation BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS fast_track_mode VARCHAR(30),
      ADD COLUMN IF NOT EXISTS auto_assessment TEXT,
      ADD COLUMN IF NOT EXISTS trend VARCHAR(20),
      ADD COLUMN IF NOT EXISTS trend_score SMALLINT,
      ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS signed_by UUID,
      ADD COLUMN IF NOT EXISTS signature_hash VARCHAR(128),
      ADD COLUMN IF NOT EXISTS signature_provider VARCHAR(30) DEFAULT 'local_hash',
      ADD COLUMN IF NOT EXISTS pfdr_transaction_id VARCHAR(120),
      ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT FALSE
    `);

        await queryRunner.query(`
      ALTER TABLE problems
      ADD COLUMN IF NOT EXISTS fhir_condition_id VARCHAR(100),
      ADD COLUMN IF NOT EXISTS snomed_code VARCHAR(30),
      ADD COLUMN IF NOT EXISTS icd11_code VARCHAR(20),
      ADD COLUMN IF NOT EXISTS category VARCHAR(20) NOT NULL DEFAULT 'symptomatic',
      ADD COLUMN IF NOT EXISTS clinical_status VARCHAR(20) NOT NULL DEFAULT 'active',
      ADD COLUMN IF NOT EXISTS closure_summary TEXT,
      ADD COLUMN IF NOT EXISTS resolution_reason VARCHAR(50),
      ADD COLUMN IF NOT EXISTS resolved_by UUID,
      ADD COLUMN IF NOT EXISTS recurrence_of_problem_id UUID,
      ADD COLUMN IF NOT EXISTS decompensation_status VARCHAR(30) NOT NULL DEFAULT 'none',
      ADD COLUMN IF NOT EXISTS decompensation_started_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS decompensation_resolved_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS thread_signed_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS thread_signed_by UUID,
      ADD COLUMN IF NOT EXISTS thread_signature_hash VARCHAR(128),
      ADD COLUMN IF NOT EXISTS thread_signature_provider VARCHAR(30) DEFAULT 'local_hash',
      ADD COLUMN IF NOT EXISTS thread_pfdr_transaction_id VARCHAR(120),
      ADD COLUMN IF NOT EXISTS is_thread_locked BOOLEAN NOT NULL DEFAULT FALSE
    `);
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
      ALTER TABLE clinical_evolutions
      DROP COLUMN IF EXISTS fhir_clinical_impression_id,
      DROP COLUMN IF EXISTS is_fast_track,
      DROP COLUMN IF EXISTS is_decompensation,
      DROP COLUMN IF EXISTS fast_track_mode,
      DROP COLUMN IF EXISTS auto_assessment,
      DROP COLUMN IF EXISTS trend,
      DROP COLUMN IF EXISTS trend_score,
      DROP COLUMN IF EXISTS signed_at,
      DROP COLUMN IF EXISTS signed_by,
      DROP COLUMN IF EXISTS signature_hash,
      DROP COLUMN IF EXISTS signature_provider,
      DROP COLUMN IF EXISTS pfdr_transaction_id,
      DROP COLUMN IF EXISTS is_locked
    `);

        await queryRunner.query(`
      ALTER TABLE problems
      DROP COLUMN IF EXISTS fhir_condition_id,
      DROP COLUMN IF EXISTS snomed_code,
      DROP COLUMN IF EXISTS icd11_code,
      DROP COLUMN IF EXISTS category,
      DROP COLUMN IF EXISTS clinical_status,
      DROP COLUMN IF EXISTS closure_summary,
      DROP COLUMN IF EXISTS resolution_reason,
      DROP COLUMN IF EXISTS resolved_by,
      DROP COLUMN IF EXISTS recurrence_of_problem_id,
      DROP COLUMN IF EXISTS decompensation_status,
      DROP COLUMN IF EXISTS decompensation_started_at,
      DROP COLUMN IF EXISTS decompensation_resolved_at,
      DROP COLUMN IF EXISTS thread_signed_at,
      DROP COLUMN IF EXISTS thread_signed_by,
      DROP COLUMN IF EXISTS thread_signature_hash,
      DROP COLUMN IF EXISTS thread_signature_provider,
      DROP COLUMN IF EXISTS thread_pfdr_transaction_id,
      DROP COLUMN IF EXISTS is_thread_locked
    `);
    }
}
