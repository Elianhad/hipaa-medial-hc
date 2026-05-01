import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import {
    FhirEvolutionTrend,
    FhirOrderStatus,
    FhirOrderType,
    FhirProblemCategory,
    FhirProblemClinicalStatus,
    FhirService,
} from '../fhir/fhir.service';

interface OutboxEvent {
    id: string;
    aggregate_type: string;
    aggregate_id: string;
    event_type: string;
    payload: Record<string, unknown>;
    retry_count: number;
}

type VerificationStatus = 'provisional' | 'differential' | 'confirmed' | 'refuted';
type OutboxSourceTable = 'medical_orders' | 'prescriptions';

const POLL_INTERVAL_MS = 5_000;   // 5 s
const BATCH_SIZE = 10;
const MAX_RETRIES = 3;

/**
 * OutboxWorkerService
 *
 * Polls the `integration_outbox` table for pending FHIR sync events
 * and dispatches them to AWS HealthLake via FhirService.
 *
 * Uses SELECT ... FOR UPDATE SKIP LOCKED so concurrent instances
 * (e.g. multiple pods) never double-process the same event.
 */
@Injectable()
export class OutboxWorkerService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(OutboxWorkerService.name);
    private intervalHandle: ReturnType<typeof setInterval> | null = null;
    private outboxAvailable = true;

    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource,
        private readonly fhirService: FhirService,
    ) { }

    async onModuleInit(): Promise<void> {
        this.outboxAvailable = await this.checkOutboxTableExists();
        if (!this.outboxAvailable) {
            this.logger.warn('OutboxWorker disabled: table integration_outbox does not exist in current environment.');
            return;
        }

        this.intervalHandle = setInterval(
            () => this.processNextBatch().catch((err: unknown) => {
                if (this.isMissingOutboxTableError(err)) {
                    this.outboxAvailable = false;
                    this.logger.warn('OutboxWorker disabled: detected missing integration_outbox table during polling.');
                    if (this.intervalHandle) {
                        clearInterval(this.intervalHandle);
                        this.intervalHandle = null;
                    }
                    return;
                }
                this.logger.error(`OutboxWorker batch failed: ${this.formatError(err)}`);
            }),
            POLL_INTERVAL_MS,
        );
        this.logger.log(`OutboxWorker started — polling every ${POLL_INTERVAL_MS / 1000}s`);
    }

    onModuleDestroy() {
        if (this.intervalHandle) clearInterval(this.intervalHandle);
    }

    // ─────────────────────────────────────────────────────────────────
    // Processing loop
    // ─────────────────────────────────────────────────────────────────

    async processNextBatch(): Promise<void> {
        if (!this.outboxAvailable) return;

        await this.dataSource.transaction(async (em) => {
            const events: OutboxEvent[] = await em.query(
                                `WITH next_events AS (
                     SELECT id, aggregate_type, aggregate_id, event_type, payload, retry_count
                     FROM integration_outbox
                     WHERE status = 'pending'
                         AND (next_retry_at IS NULL OR next_retry_at <= NOW())
                     ORDER BY id ASC
                     LIMIT $1
                     FOR UPDATE SKIP LOCKED
                 )
                 UPDATE integration_outbox AS outbox
                 SET status = 'processing'
                 FROM next_events
                 WHERE outbox.id = next_events.id
                 RETURNING next_events.id, next_events.aggregate_type, next_events.aggregate_id, next_events.event_type, next_events.payload, next_events.retry_count`,
                [BATCH_SIZE],
            );

            for (const event of events) {
                await this.processEvent(em, event);
            }
        });
    }

    // ─────────────────────────────────────────────────────────────────
    // Per-event dispatch
    // ─────────────────────────────────────────────────────────────────

    private async processEvent(
        em: EntityManager,
        event: OutboxEvent,
    ): Promise<void> {
        try {
            await this.dispatch(event);

            await em.query(
                `UPDATE integration_outbox
         SET status = 'completed', processed_at = NOW(), next_retry_at = NULL, last_error = NULL
         WHERE id = $1`,
                [event.id],
            );

            this.logger.debug(`[outbox] Processed event ${event.event_type} id=${event.id}`);
        } catch (err: unknown) {
            const nextRetryCount = event.retry_count + 1;
            const exhaustedRetries = nextRetryCount >= MAX_RETRIES;
            const nextRetry = exhaustedRetries ? null : this.nextRetryAt(event.retry_count);
            const newStatus = exhaustedRetries ? 'failed' : 'pending';

            await em.query(
                `UPDATE integration_outbox
         SET status = $2,
             retry_count = $3,
             last_error = $4,
             next_retry_at = $5,
             processed_at = NULL
         WHERE id = $1`,
                [event.id, newStatus, nextRetryCount, this.formatError(err), nextRetry],
            );

            if (newStatus === 'failed') {
                this.logger.error(
                    `[outbox] Event ${event.event_type} id=${event.id} exhausted retries. Last error: ${this.formatError(err)}`,
                );
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // FHIR dispatch routing
    // ─────────────────────────────────────────────────────────────────

    private async dispatch(event: OutboxEvent): Promise<void> {
        const p = event.payload;

        switch (event.aggregate_type) {
            // ── Problem → Condition ──────────────────────────────────────
            case 'problem': {
                if (event.event_type === 'problem.decompensation_started' ||
                    event.event_type === 'problem.decompensation_resolved') {
                    // Decompensation — update Condition clinicalStatus
                    const fhirConditionId = this.getString(p, 'fhirConditionId');
                    if (fhirConditionId) {
                        await this.fhirService.upsertProblem(
                            {
                                patientFhirId: this.getRequiredString(p, 'patientId'),
                                tenantId: this.getRequiredString(p, 'tenantId'),
                                title: this.getString(p, 'title') ?? 'Problema crónico',
                                clinicalStatus: event.event_type === 'problem.decompensation_resolved'
                                    ? 'active'
                                    : 'active', // condition itself stays active; evolution thread notes decompensation
                                category: this.getProblemCategory(p, 'category') ?? 'problem-list-item',
                                verificationStatus: this.getVerificationStatus(p, 'verificationStatus'),
                            },
                            fhirConditionId,
                        );
                    }
                    break;
                }

                // Standard create/update
                await this.fhirService.upsertProblem(
                    {
                        patientFhirId: this.getRequiredString(p, 'patientId'),
                        tenantId: this.getRequiredString(p, 'tenantId'),
                        title: this.getRequiredString(p, 'title'),
                        clinicalStatus: this.getProblemClinicalStatus(p, 'clinicalStatus') ?? 'active',
                        category: this.getProblemCategory(p, 'category') ?? 'encounter-diagnosis',
                        verificationStatus: this.getVerificationStatus(p, 'verificationStatus'),
                        onsetDate: this.getString(p, 'onsetDate'),
                        abatementDate: this.getString(p, 'resolutionDate'),
                        closureSummary: this.getString(p, 'closureSummary'),
                        snomedCode: this.getString(p, 'snomedCode'),
                        icd10Code: this.getString(p, 'icd10Code'),
                        icd11Code: this.getString(p, 'icd11Code'),
                    },
                    this.getString(p, 'fhirConditionId'),
                );
                break;
            }

            // ── Evolution → Encounter + ClinicalImpression + Observations ─
            case 'evolution': {
                const result = await this.fhirService.createEvolution({
                    patientFhirId: this.getRequiredString(p, 'patientId'),
                    practitionerFhirId: this.getRequiredString(p, 'professionalId'),
                    tenantId: this.getRequiredString(p, 'tenantId'),
                    evolutionDate: this.getString(p, 'evolutionDate') ?? new Date().toISOString(),
                    subjective: this.getString(p, 'subjective'),
                    objective: this.getString(p, 'objective'),
                    assessment: this.getString(p, 'assessment'),
                    plan: this.getString(p, 'plan'),
                    trend: this.getEvolutionTrend(p, 'trend'),
                    problemFhirId: this.getString(p, 'fhirConditionId'),
                    problemTitle: this.getString(p, 'problemTitle'),
                    icd10Code: this.getString(p, 'icd10Code'),
                    problemClinicalStatus: this.getProblemClinicalStatus(p, 'clinicalStatus'),
                });

                // Persist FHIR resource IDs back to local record
                await this.dataSource.query(
                    `UPDATE clinical_evolutions
           SET fhir_encounter_id = $2,
               fhir_clinical_impression_id = $3
           WHERE id = $1`,
                    [p.evolutionId, result.encounterId, result.clinicalImpressionId],
                );
                break;
            }

            // ── Order → MedicationRequest / ServiceRequest ────────────────
                case 'medical_order': {
                const today = new Date().toISOString().split('T')[0];
                const result = await this.fhirService.createOrder({
                        orderId: this.getRequiredString(p, 'orderId'),
                        patientFhirId: this.getRequiredString(p, 'patientId'),
                        practitionerFhirId: this.getRequiredString(p, 'professionalId'),
                        problemFhirId: this.getString(p, 'fhirConditionId') ?? this.getString(p, 'problemId'),
                        encounterId: this.getString(p, 'encounterId'),
                        tenantId: this.getRequiredString(p, 'tenantId'),
                        authoredOn: this.getString(p, 'authoredOn') ?? today,
                        type: this.getOrderType(p, 'orderType') === 'laboratory' || this.getOrderType(p, 'orderType') === 'imaging'
                            ? (this.getOrderType(p, 'orderType') as FhirOrderType)
                        : 'medication',
                        status: this.getOrderStatus(p, 'status') ?? 'active',
                        detail: this.getString(p, 'drugName') ?? this.getString(p, 'detail') ?? 'Orden clínica',
                        medicationCode: this.getString(p, 'rxnormCode') ?? this.getString(p, 'medicationCode'),
                        medicationDisplay: this.getString(p, 'drugName') ?? this.getString(p, 'medicationDisplay'),
                        serviceCode: this.getString(p, 'serviceCode'),
                        serviceDisplay: this.getString(p, 'serviceDisplay'),
                        note: this.getString(p, 'instructions') ?? this.getString(p, 'note'),
                });

                // Persist FHIR ID back
                    const sourceTable = this.getSourceTable(p);
                    const table = sourceTable === 'prescriptions' ? 'prescriptions' : 'medical_orders';
                    const idColumn = sourceTable === 'prescriptions' ? 'fhir_medication_request_id' : 'fhir_resource_id';

                await this.dataSource.query(
                    `UPDATE ${table} SET ${idColumn} = $2 WHERE id = $1`,
                        [this.getRequiredString(p, 'orderId'), result.id],
                );
                break;
            }

            default:
                this.logger.warn(`[outbox] Unknown aggregate_type: ${event.aggregate_type}`);
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // Exponential back-off: 2^n minutes, capped at 60 min
    // ─────────────────────────────────────────────────────────────────

    private nextRetryAt(retryCount: number): Date {
        const delayMs = Math.min(Math.pow(2, retryCount) * 60_000, 3_600_000);
        return new Date(Date.now() + delayMs);
    }

    private async checkOutboxTableExists(): Promise<boolean> {
        try {
            const rows: Array<{ regclass: string | null }> = await this.dataSource.query(
                `SELECT to_regclass('public.integration_outbox') AS regclass`,
            );

            return Boolean(rows[0]?.regclass);
        } catch (err: unknown) {
            this.logger.warn(`OutboxWorker table check failed: ${this.formatError(err)}`);
            return false;
        }
    }

    private isMissingOutboxTableError(err: unknown): boolean {
        const message = this.formatError(err);
        const code = typeof err === 'object' && err !== null && 'code' in err ? String(err.code) : '';
        return code === '42P01' || message.includes('integration_outbox') || message.includes('does not exist');
    }

    private formatError(err: unknown): string {
        if (err instanceof Error) {
            return err.message;
        }

        return String(err);
    }

    private getString(payload: Record<string, unknown>, key: string): string | undefined {
        const value = payload[key];
        return typeof value === 'string' && value.length > 0 ? value : undefined;
    }

    private getRequiredString(payload: Record<string, unknown>, key: string): string {
        const value = this.getString(payload, key);
        if (!value) {
            throw new Error(`Outbox payload is missing required field ${key}`);
        }

        return value;
    }

    private getProblemClinicalStatus(
        payload: Record<string, unknown>,
        key: string,
    ): FhirProblemClinicalStatus | undefined {
        const value = this.getString(payload, key);
        if (!value) return undefined;

        const allowed: FhirProblemClinicalStatus[] = ['active', 'resolved', 'inactive', 'recurrence', 'remission'];
        return allowed.includes(value as FhirProblemClinicalStatus)
            ? (value as FhirProblemClinicalStatus)
            : undefined;
    }

    private getProblemCategory(
        payload: Record<string, unknown>,
        key: string,
    ): FhirProblemCategory | undefined {
        const value = this.getString(payload, key);
        if (!value) return undefined;

        const allowed: FhirProblemCategory[] = ['encounter-diagnosis', 'problem-list-item', 'health-concern'];
        return allowed.includes(value as FhirProblemCategory)
            ? (value as FhirProblemCategory)
            : undefined;
    }

    private getVerificationStatus(
        payload: Record<string, unknown>,
        key: string,
    ): VerificationStatus | undefined {
        const value = this.getString(payload, key);
        if (!value) return undefined;

        const allowed: VerificationStatus[] = ['provisional', 'differential', 'confirmed', 'refuted'];
        return allowed.includes(value as VerificationStatus)
            ? (value as VerificationStatus)
            : undefined;
    }

    private getEvolutionTrend(
        payload: Record<string, unknown>,
        key: string,
    ): FhirEvolutionTrend | undefined {
        const value = this.getString(payload, key);
        if (!value) return undefined;

        const allowed: FhirEvolutionTrend[] = ['improving', 'stable', 'worsening', 'resolution'];
        return allowed.includes(value as FhirEvolutionTrend)
            ? (value as FhirEvolutionTrend)
            : undefined;
    }

    private getOrderType(
        payload: Record<string, unknown>,
        key: string,
    ): FhirOrderType | undefined {
        const value = this.getString(payload, key);
        if (!value) return undefined;

        const allowed: FhirOrderType[] = ['medication', 'laboratory', 'imaging'];
        return allowed.includes(value as FhirOrderType)
            ? (value as FhirOrderType)
            : undefined;
    }

    private getOrderStatus(
        payload: Record<string, unknown>,
        key: string,
    ): FhirOrderStatus | undefined {
        const value = this.getString(payload, key);
        if (!value) return undefined;

        const allowed: FhirOrderStatus[] = ['draft', 'active', 'completed', 'cancelled'];
        return allowed.includes(value as FhirOrderStatus)
            ? (value as FhirOrderStatus)
            : undefined;
    }

    private getSourceTable(payload: Record<string, unknown>): OutboxSourceTable {
        const value = this.getString(payload, 'sourceTable');
        if (value === 'prescriptions') {
            return 'prescriptions';
        }

        return 'medical_orders';
    }
}
