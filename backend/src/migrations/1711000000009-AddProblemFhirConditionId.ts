import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProblemFhirConditionId1711000000009 implements MigrationInterface {
    name = 'AddProblemFhirConditionId1711000000009';

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
      ALTER TABLE problems
      ADD COLUMN IF NOT EXISTS fhir_condition_id VARCHAR(100)
    `);
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
      ALTER TABLE problems
      DROP COLUMN IF EXISTS fhir_condition_id
    `);
    }
}
