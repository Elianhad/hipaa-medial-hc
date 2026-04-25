import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * ProblemEnumsV2
 *
 * Alinea los valores de los campos VARCHAR category y clinical_status
 * con FHIR R4 Condition (columnas creadas como VARCHAR en migration 010).
 *
 *  - category:         acute/chronic/symptomatic → encounter_diagnosis/problem_list_item/health_concern
 *  - clinical_status:  recurrent → recurrence
 *  - Nueva columna:    verification_status VARCHAR(20) DEFAULT 'provisional'
 *  - status:           marcada nullable (deprecated)
 */
export class ProblemEnumsV21711000000011 implements MigrationInterface {
    name = 'ProblemEnumsV21711000000011';

    async up(queryRunner: QueryRunner): Promise<void> {
        // ── 1. verification_status column ─────────────────────────────────────
        await queryRunner.query(`
            ALTER TABLE problems
            ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'provisional'
        `);

        // ── 2. Migrate category values ─────────────────────────────────────────
        await queryRunner.query(`
            UPDATE problems
            SET category = 'encounter_diagnosis'
            WHERE category IN ('acute', 'symptomatic')
        `);
        await queryRunner.query(`
            UPDATE problems
            SET category = 'problem_list_item'
            WHERE category = 'chronic'
        `);

        // ── 3. Migrate clinical_status values ──────────────────────────────────
        await queryRunner.query(`
            UPDATE problems
            SET clinical_status = 'recurrence'
            WHERE clinical_status = 'recurrent'
        `);

        // ── 4. status nullable (deprecated) ───────────────────────────────────
        await queryRunner.query(`
            ALTER TABLE problems
            ALTER COLUMN status DROP NOT NULL
        `);

        // ── 5. Deduplication index ─────────────────────────────────────────────
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_problems_dedup
            ON problems (tenant_id, patient_id, snomed_code, icd10_code, icd11_code)
            WHERE clinical_status NOT IN ('resolved', 'refuted')
        `);
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS idx_problems_dedup`);

        await queryRunner.query(`
            UPDATE problems
            SET clinical_status = 'recurrent'
            WHERE clinical_status = 'recurrence'
        `);

        await queryRunner.query(`
            UPDATE problems
            SET category = 'chronic'
            WHERE category = 'problem_list_item'
        `);
        await queryRunner.query(`
            UPDATE problems
            SET category = 'symptomatic'
            WHERE category IN ('encounter_diagnosis', 'health_concern')
        `);

        await queryRunner.query(`
            ALTER TABLE problems
            ALTER COLUMN status SET NOT NULL
        `);

        await queryRunner.query(`
            ALTER TABLE problems
            DROP COLUMN IF EXISTS verification_status
        `);
    }
}

