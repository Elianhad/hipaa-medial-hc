import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * VerifyOutboxSchema
 *
 * Idempotent migration that ensures the integration_outbox table
 * has the full schema expected by OutboxWorkerService:
 *   - status enum with all four lifecycle values
 *   - retry_count, next_retry_at, processed_at, last_error columns
 *   - RLS enabled with tenant-isolation policy
 *   - Covering index for the worker polling query
 *
 * Safe to run against a DB that already has migration 004 applied —
 * all statements use IF NOT EXISTS / IF EXISTS guards.
 */
export class VerifyOutboxSchema1711000000012 implements MigrationInterface {
    name = 'VerifyOutboxSchema1711000000012';

    async up(queryRunner: QueryRunner): Promise<void> {
        // ── 1. Enum type ───────────────────────────────────────────────────────
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE integration_event_status AS ENUM (
                    'pending', 'processing', 'failed', 'completed'
                );
            EXCEPTION WHEN duplicate_object THEN null;
            END $$
        `);

        // ── 2. Table ───────────────────────────────────────────────────────────
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS integration_outbox (
                id             BIGSERIAL PRIMARY KEY,
                tenant_id      UUID REFERENCES tenants (id),
                aggregate_type VARCHAR(50) NOT NULL,
                aggregate_id   UUID NOT NULL,
                event_type     VARCHAR(100) NOT NULL,
                payload        JSONB NOT NULL,
                status         integration_event_status NOT NULL DEFAULT 'pending',
                retry_count    INTEGER NOT NULL DEFAULT 0,
                next_retry_at  TIMESTAMPTZ,
                processed_at   TIMESTAMPTZ,
                last_error     TEXT,
                created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                CHECK (aggregate_type IN ('problem', 'evolution', 'medical_order'))
            )
        `);

        // ── 3. Columns — add if missing (idempotent) ──────────────────────────
        await queryRunner.query(`
            ALTER TABLE integration_outbox
                ADD COLUMN IF NOT EXISTS retry_count  INTEGER NOT NULL DEFAULT 0,
                ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ,
                ADD COLUMN IF NOT EXISTS processed_at  TIMESTAMPTZ,
                ADD COLUMN IF NOT EXISTS last_error    TEXT
        `);

        // status column: add as VARCHAR then cast if the enum already exists
        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'integration_outbox' AND column_name = 'status'
                ) THEN
                    ALTER TABLE integration_outbox
                        ADD COLUMN status integration_event_status NOT NULL DEFAULT 'pending';
                END IF;
            END $$
        `);

        // ── 4. Indexes ─────────────────────────────────────────────────────────
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_integration_outbox_pending
                ON integration_outbox (status, next_retry_at, created_at)
        `);

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_integration_outbox_aggregate
                ON integration_outbox (aggregate_type, aggregate_id, created_at DESC)
        `);

        // ── 5. Row-level security ──────────────────────────────────────────────
        await queryRunner.query(`
            ALTER TABLE integration_outbox ENABLE ROW LEVEL SECURITY
        `);

        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_policies
                    WHERE tablename = 'integration_outbox'
                      AND policyname = 'integration_outbox_tenant_isolation'
                ) THEN
                    CREATE POLICY integration_outbox_tenant_isolation
                        ON integration_outbox
                        USING (
                            is_super_admin()
                            OR tenant_id = current_tenant_id()
                        );
                END IF;
            END $$
        `);
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS integration_outbox`);
        await queryRunner.query(`DROP TYPE IF EXISTS integration_event_status`);
    }
}
