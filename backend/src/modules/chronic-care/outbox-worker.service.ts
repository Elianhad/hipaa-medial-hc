import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { FhirService } from '../fhir/fhir.service';

interface OutboxEvent {
    id: bigint;
    aggregate_type: string;
    aggregate_id: string;
    event_type: string;
    payload: Record<string, any>;
    retry_count: number;
}

const POLL_INTERVAL_MS = 5_000;   // 5 s
const BATCH_SIZE = 10;
const MAX_RETRIES = 5;

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

    async onModuleInit() {
        this.outboxAvailable = await this.checkOutboxTableExists();
        if (!this.outboxAvailable) {
            this.logger.warn('OutboxWorker disabled: table integration_outbox does not exist in current environment.');
            return;
        }

        this.intervalHandle = setInterval(
            () => this.processNextBatch().catch((err: any) => {
                if (this.isMissingOutboxTableError(err)) {
                    this.outboxAvailable = false;
                    this.logger.warn('OutboxWorker disabled: detected missing integration_outbox table during polling.');
                    if (this.intervalHandle) {
                        clearInterval(this.intervalHandle);
                        this.intervalHandle = null;
                    }
                    return;
                }
                this.logger.error('OutboxWorker batch failed', err);
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
                `SELECT id, aggregate_type, aggregate_id, event_type, payload, retry_count
         FROM integration_outbox
         WHERE status = 'pending'
           AND (next_retry_at IS NULL OR next_retry_at <= NOW())
         ORDER BY id ASC
         LIMIT $1
         FOR UPDATE SKIP LOCKED`,
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
        em: any,
        event: OutboxEvent,
    ): Promise<void> {
        try {
            await this.dispatch(event);

            await em.query(
                `UPDATE integration_outbox
         SET status = 'processed', processed_at = NOW()
         WHERE id = $1`,
                [event.id],
            );

            this.logger.debug(`[outbox] Processed event ${event.event_type} id=${event.id}`);
        } catch (err: any) {
            const nextRetry = event.retry_count >= MAX_RETRIES - 1 ? null : this.nextRetryAt(event.retry_count);
            const newStatus = event.retry_count >= MAX_RETRIES - 1 ? 'failed' : 'pending';

            await em.query(
                `UPDATE integration_outbox
         SET status = $2,
             retry_count = retry_count + 1,
             last_error = $3,
             next_retry_at = $4
         WHERE id = $1`,
                [event.id, newStatus, err?.message ?? String(err), nextRetry],
            );

            if (newStatus === 'failed') {
                this.logger.error(
                    `[outbox] Event ${event.event_type} id=${event.id} exhausted retries. Last error: ${err?.message}`,
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
                    if (p.fhirConditionId) {
                        await this.fhirService.upsertProblem(
                            {
                                patientFhirId: p.patientId,
                                tenantId: p.tenantId,
                                title: p.title ?? 'Problema crónico',
                                clinicalStatus: event.event_type === 'problem.decompensation_resolved'
                                    ? 'active'
                                    : 'active', // condition itself stays active; evolution thread notes decompensation
                                category: p.category ?? 'problem-list-item',
                                verificationStatus: p.verificationStatus,
                            },
                            p.fhirConditionId,
                        );
                    }
                    break;
                }

                // Standard create/update
                await this.fhirService.upsertProblem(
                    {
                        patientFhirId: p.patientId,
                        tenantId: p.tenantId,
                        title: p.title,
                        clinicalStatus: p.clinicalStatus ?? 'active',
                        category: p.category ?? 'encounter-diagnosis',
                        verificationStatus: p.verificationStatus,
                        onsetDate: p.onsetDate,
                        abatementDate: p.resolutionDate,
                        closureSummary: p.closureSummary,
                        snomedCode: p.snomedCode,
                        icd10Code: p.icd10Code,
                        icd11Code: p.icd11Code,
                    },
                    p.fhirConditionId,
                );
                break;
            }

            // ── Evolution → Encounter + ClinicalImpression + Observations ─
            case 'evolution': {
                const result = await this.fhirService.createEvolution({
                    patientFhirId: p.patientId,
                    practitionerFhirId: p.professionalId,
                    tenantId: p.tenantId,
                    evolutionDate: p.evolutionDate ?? new Date().toISOString(),
                    subjective: p.subjective,
                    objective: p.objective,
                    assessment: p.assessment,
                    plan: p.plan,
                    trend: p.trend,
                    problemFhirId: p.fhirConditionId,
                    problemTitle: p.problemTitle,
                    icd10Code: p.icd10Code,
                    problemClinicalStatus: p.clinicalStatus,
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
            case 'medical_order':
            case 'prescription': {
                const today = new Date().toISOString().split('T')[0];
                const result = await this.fhirService.createOrder({
                    orderId: p.orderId ?? p.prescriptionId,
                    patientFhirId: p.patientId,
                    practitionerFhirId: p.professionalId ?? p.professionalId,
                    problemFhirId: p.fhirConditionId ?? p.problemId,
                    encounterId: p.encounterId,
                    tenantId: p.tenantId,
                    authoredOn: p.authoredOn ?? today,
                    type: p.orderType === 'laboratory' || p.orderType === 'imaging'
                        ? p.orderType
                        : 'medication',
                    status: p.status ?? 'active',
                    detail: p.drugName ?? p.orderData?.detail ?? p.detail,
                    medicationCode: p.rxnormCode ?? p.medicationCode,
                    medicationDisplay: p.drugName ?? p.medicationDisplay,
                    serviceCode: p.serviceCode,
                    serviceDisplay: p.serviceDisplay,
                    note: p.instructions ?? p.note,
                });

                // Persist FHIR ID back
                const table = event.aggregate_type === 'prescription'
                    ? 'prescriptions'
                    : 'medical_orders';
                const idColumn = event.aggregate_type === 'prescription'
                    ? 'fhir_medication_request_id'
                    : 'fhir_resource_id';

                await this.dataSource.query(
                    `UPDATE ${table} SET ${idColumn} = $2 WHERE id = $1`,
                    [p.prescriptionId ?? p.orderId, result.id],
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
        } catch (err: any) {
            this.logger.warn(`OutboxWorker table check failed: ${err?.message ?? String(err)}`);
            return false;
        }
    }

    private isMissingOutboxTableError(err: any): boolean {
        const message = String(err?.message ?? '');
        return err?.code === '42P01' || message.includes('integration_outbox') || message.includes('does not exist');
    }
}
