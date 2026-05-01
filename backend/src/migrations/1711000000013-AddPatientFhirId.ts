import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AddPatientFhirId
 *
 * Adds `fhir_id` to the `patients` table.
 * This column stores the canonical Patient.id assigned by Medplum (FHIR server)
 * after the first successful sync, making it the Single Source of Truth for
 * cross-system patient identity.
 *
 * Design decisions:
 *  - NULLABLE: patients created before FHIR sync don't have an ID yet.
 *  - UNIQUE (sparse): once assigned, each Medplum ID maps to exactly one local patient.
 *  - VARCHAR(255): compatible with Medplum UUIDs and any FHIR server ID format.
 */
export class AddPatientFhirId1711000000013 implements MigrationInterface {
    name = 'AddPatientFhirId1711000000013';

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE patients
            ADD COLUMN IF NOT EXISTS fhir_id VARCHAR(255)
        `);

        await queryRunner.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS uq_patients_fhir_id
            ON patients (fhir_id)
            WHERE fhir_id IS NOT NULL
        `);
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS uq_patients_fhir_id`);
        await queryRunner.query(`ALTER TABLE patients DROP COLUMN IF EXISTS fhir_id`);
    }
}
