import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { OutboxWorkerService } from '../outbox-worker.service';
import { FhirService } from '../../fhir/fhir.service';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeEmMock(overrides: Partial<{ query: jest.Mock }> = {}) {
    return { query: jest.fn().mockResolvedValue([]), ...overrides };
}

const TENANT_ID = 'tenant-uuid-001';
const PATIENT_ID = 'patient-uuid-001';
const PROFESSIONAL_ID = 'prof-uuid-001';

function makeEvent(
    aggregateType: string,
    payload: Record<string, unknown>,
    retryCount = 0,
): {
    id: string;
    aggregate_type: string;
    aggregate_id: string;
    event_type: string;
    payload: Record<string, unknown>;
    retry_count: number;
} {
    return {
        id: 'outbox-event-001',
        aggregate_type: aggregateType,
        aggregate_id: 'agg-uuid-001',
        event_type: `${aggregateType}.created`,
        payload,
        retry_count: retryCount,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────

const mockFhirService: Partial<FhirService> = {
    upsertProblem: jest.fn().mockResolvedValue('fhir-condition-001'),
    createEvolution: jest.fn().mockResolvedValue({
        encounterId: 'fhir-enc-001',
        clinicalImpressionId: 'fhir-ci-001',
        observationIds: [],
    }),
    createOrder: jest.fn().mockResolvedValue({ id: 'fhir-order-001', resourceType: 'ServiceRequest' }),
};

function makeDataSourceMock(queryImpl?: jest.Mock) {
    const emMock = makeEmMock({ query: queryImpl ?? jest.fn().mockResolvedValue([]) });
    return {
        query: emMock.query,
        transaction: jest.fn(async (cb: unknown) => (cb as (em: typeof emMock) => Promise<void>)(emMock)),
    } as unknown as DataSource;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('OutboxWorkerService', () => {
    let service: OutboxWorkerService;
    let dataSource: ReturnType<typeof makeDataSourceMock>;
    let fhirService: typeof mockFhirService;

    async function buildModule(dsOverride?: ReturnType<typeof makeDataSourceMock>) {
        dataSource = dsOverride ?? makeDataSourceMock();
        fhirService = { ...mockFhirService };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OutboxWorkerService,
                { provide: DataSource, useValue: dataSource },
                { provide: FhirService, useValue: fhirService },
            ],
        }).compile();

        service = module.get(OutboxWorkerService);
        // Prevent polling from starting in tests
        jest.spyOn(service, 'onModuleInit').mockResolvedValue(undefined);
        return service;
    }

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ── Table availability check ───────────────────────────────────────────────

    describe('onModuleInit', () => {
        it('starts polling when integration_outbox table exists', async () => {
            const ds = makeDataSourceMock(
                jest.fn().mockResolvedValueOnce([{ regclass: 'integration_outbox' }]),
            );
            await buildModule(ds);
            jest.spyOn(service, 'onModuleInit').mockRestore?.();
            const setIntervalSpy = jest.spyOn(global, 'setInterval').mockReturnValue(1 as unknown as ReturnType<typeof setInterval>);

            await service.onModuleInit();

            expect(setIntervalSpy).toHaveBeenCalledTimes(1);
            setIntervalSpy.mockRestore();
        });

        it('stays disabled when table does not exist', async () => {
            const ds = makeDataSourceMock(
                jest.fn().mockResolvedValueOnce([{ regclass: null }]),
            );
            await buildModule(ds);
            jest.spyOn(service, 'onModuleInit').mockRestore?.();
            const setIntervalSpy = jest.spyOn(global, 'setInterval');

            await service.onModuleInit();

            expect(setIntervalSpy).not.toHaveBeenCalled();
        });
    });

    // ── problem aggregate ──────────────────────────────────────────────────────

    describe('dispatch — problem', () => {
        it('calls fhirService.upsertProblem with correct mapped fields (happy path)', async () => {
            await buildModule();
            const event = makeEvent('problem', {
                patientId: PATIENT_ID,
                tenantId: TENANT_ID,
                title: 'Hipertensión arterial',
                clinicalStatus: 'active',
                category: 'problem-list-item',
                snomedCode: '38341003',
                icd10Code: 'I10',
            });

            const emQuery = jest.fn().mockResolvedValue([]);
            const emMock = makeEmMock({ query: emQuery });
            // Simulate SELECT FOR UPDATE returning this event with status=processing
            (dataSource as unknown as { transaction: jest.Mock }).transaction = jest.fn(async (cb: unknown) => (cb as (em: typeof emMock) => Promise<void>)(emMock));
            (dataSource as unknown as { query: jest.Mock }).query = jest
                .fn()
                // table-exists check
                .mockResolvedValueOnce([{ regclass: 'integration_outbox' }])
                // batch SELECT/UPDATE FOR UPDATE — returns one event
                .mockResolvedValueOnce([event]);
            emMock.query = jest
                .fn()
                // batch UPDATE SET processing
                .mockResolvedValueOnce([event])
                // final UPDATE SET completed
                .mockResolvedValueOnce([]);

            // patch dispatch directly to exercise the problem branch
            await (service as unknown as { dispatch: (e: typeof event) => Promise<void> }).dispatch(event);

            expect(fhirService.upsertProblem).toHaveBeenCalledWith(
                expect.objectContaining({
                    patientFhirId: PATIENT_ID,
                    tenantId: TENANT_ID,
                    title: 'Hipertensión arterial',
                    clinicalStatus: 'active',
                    category: 'problem-list-item',
                    snomedCode: '38341003',
                    icd10Code: 'I10',
                }),
                undefined,
            );
        });

        it('throws if required patientId is missing', async () => {
            await buildModule();
            const event = makeEvent('problem', {
                tenantId: TENANT_ID,
                title: 'Falta patientId',
            });

            await expect(
                (service as unknown as { dispatch: (e: typeof event) => Promise<void> }).dispatch(event),
            ).rejects.toThrow('patientId');
        });
    });

    // ── evolution aggregate ────────────────────────────────────────────────────

    describe('dispatch — evolution', () => {
        it('calls fhirService.createEvolution with subjective field from payload (happy path)', async () => {
            await buildModule();
            const event = makeEvent('evolution', {
                patientId: PATIENT_ID,
                professionalId: PROFESSIONAL_ID,
                tenantId: TENANT_ID,
                evolutionDate: '2026-05-01T10:00:00.000Z',
                subjective: 'Paciente refiere cefalea',
                objective: 'TA 140/90',
                assessment: 'HTA no controlada',
                plan: 'Ajuste de medicación',
                trend: 'worsening',
            });
            (dataSource as unknown as { query: jest.Mock }).query = jest.fn().mockResolvedValue([]);

            await (service as unknown as { dispatch: (e: typeof event) => Promise<void> }).dispatch(event);

            expect(fhirService.createEvolution).toHaveBeenCalledWith(
                expect.objectContaining({
                    patientFhirId: PATIENT_ID,
                    practitionerFhirId: PROFESSIONAL_ID,
                    subjective: 'Paciente refiere cefalea',
                    trend: 'worsening',
                }),
            );
        });

        it('does NOT use anamnesisNarrative — only subjective key is consumed', async () => {
            await buildModule();
            const event = makeEvent('evolution', {
                patientId: PATIENT_ID,
                professionalId: PROFESSIONAL_ID,
                tenantId: TENANT_ID,
                // Old key — must be ignored
                anamnesisNarrative: 'old key should be ignored',
            });
            (dataSource as unknown as { query: jest.Mock }).query = jest.fn().mockResolvedValue([]);

            await (service as unknown as { dispatch: (e: typeof event) => Promise<void> }).dispatch(event);

            const call = (fhirService.createEvolution as jest.Mock).mock.calls[0][0];
            expect(call.subjective).toBeUndefined();
        });
    });

    // ── medical_order aggregate ────────────────────────────────────────────────

    describe('dispatch — medical_order', () => {
        it('calls fhirService.createOrder with status field from payload (happy path)', async () => {
            await buildModule();
            const event = makeEvent('medical_order', {
                orderId: 'order-uuid-001',
                patientId: PATIENT_ID,
                professionalId: PROFESSIONAL_ID,
                tenantId: TENANT_ID,
                orderType: 'laboratory',
                detail: 'Hemograma completo',
                status: 'active',
                sourceTable: 'medical_orders',
            });
            (dataSource as unknown as { query: jest.Mock }).query = jest.fn().mockResolvedValue([]);

            await (service as unknown as { dispatch: (e: typeof event) => Promise<void> }).dispatch(event);

            expect(fhirService.createOrder).toHaveBeenCalledWith(
                expect.objectContaining({
                    orderId: 'order-uuid-001',
                    patientFhirId: PATIENT_ID,
                    status: 'active',
                    type: 'laboratory',
                }),
            );
        });

        it('does NOT use orderStatus key — reads status from payload', async () => {
            await buildModule();
            const event = makeEvent('medical_order', {
                orderId: 'order-uuid-002',
                patientId: PATIENT_ID,
                professionalId: PROFESSIONAL_ID,
                tenantId: TENANT_ID,
                orderType: 'medication',
                detail: 'Ibuprofeno',
                // orderStatus would be the old broken key; provide status only
                status: 'completed',
                sourceTable: 'medical_orders',
            });
            (dataSource as unknown as { query: jest.Mock }).query = jest.fn().mockResolvedValue([]);

            await (service as unknown as { dispatch: (e: typeof event) => Promise<void> }).dispatch(event);

            const call = (fhirService.createOrder as jest.Mock).mock.calls[0][0];
            expect(call.status).toBe('completed');
        });
    });

    // ── retry and failure logic ────────────────────────────────────────────────

    describe('processEvent — retry / failure logic', () => {
        async function runProcessEvent(
            event: ReturnType<typeof makeEvent>,
            fhirShouldFail: boolean,
        ) {
            await buildModule();
            if (fhirShouldFail) {
                (fhirService.upsertProblem as jest.Mock).mockRejectedValueOnce(
                    new Error('FHIR unavailable'),
                );
            }
            const emQuery = jest.fn().mockResolvedValue([]);
            const emMock = makeEmMock({ query: emQuery });
            await (
                service as unknown as {
                    processEvent: (em: typeof emMock, e: typeof event) => Promise<void>;
                }
            ).processEvent(emMock, event);
            return emQuery;
        }

        it('marks status=completed and sets processed_at on success', async () => {
            const event = makeEvent('problem', {
                patientId: PATIENT_ID,
                tenantId: TENANT_ID,
                title: 'Test',
            });
            const emQuery = await runProcessEvent(event, false);

            const updateCall: string = emQuery.mock.calls[0][0];
            expect(updateCall).toContain("status = 'completed'");
            expect(updateCall).toContain('processed_at = NOW()');
        });

        it('increments retry_count and sets status=pending when retries remain (retry 0 → 1)', async () => {
            const event = makeEvent(
                'problem',
                { patientId: PATIENT_ID, tenantId: TENANT_ID, title: 'Test' },
                0,
            );
            const emQuery = await runProcessEvent(event, true);

            const [sql, params] = emQuery.mock.calls[0] as [string, unknown[]];
            expect(sql).toContain('retry_count = $3');
            // newStatus should be 'pending' (retryCount=1 < MAX_RETRIES=3)
            expect(params[1]).toBe('pending');
            // newRetryCount = 0 + 1 = 1
            expect(params[2]).toBe(1);
        });

        it('marks status=failed when retry_count reaches MAX_RETRIES (retry 2 → 3)', async () => {
            const event = makeEvent(
                'problem',
                { patientId: PATIENT_ID, tenantId: TENANT_ID, title: 'Test' },
                2, // one more attempt will reach 3 = MAX_RETRIES
            );
            const emQuery = await runProcessEvent(event, true);

            const [sql, params] = emQuery.mock.calls[0] as [string, unknown[]];
            expect(sql).toContain('retry_count = $3');
            expect(params[1]).toBe('failed');
            expect(params[2]).toBe(3);
            // next_retry_at must be null when exhausted
            expect(params[4]).toBeNull();
        });

        it('sets next_retry_at with exponential backoff when retries remain', async () => {
            const now = Date.now();
            jest.spyOn(Date, 'now').mockReturnValue(now);

            const event = makeEvent(
                'problem',
                { patientId: PATIENT_ID, tenantId: TENANT_ID, title: 'Test' },
                1, // retry_count=1 → next delay = 2^1 * 60_000 = 2 min
            );
            const emQuery = await runProcessEvent(event, true);

            const [, params] = emQuery.mock.calls[0] as [string, unknown[]];
            const nextRetryAt = params[4] as Date;
            expect(nextRetryAt).not.toBeNull();
            const expectedDelay = Math.pow(2, 1) * 60_000; // 120_000 ms
            expect(nextRetryAt.getTime()).toBe(now + expectedDelay);

            jest.spyOn(Date, 'now').mockRestore();
        });
    });

    // ── aggregate_type guard ───────────────────────────────────────────────────

    describe('dispatch — unknown aggregate_type', () => {
        it('does not call any fhir method for unknown aggregate types', async () => {
            await buildModule();
            const event = makeEvent('prescription_v2', {
                patientId: PATIENT_ID,
                tenantId: TENANT_ID,
            });

            await (service as unknown as { dispatch: (e: typeof event) => Promise<void> }).dispatch(event);

            expect(fhirService.upsertProblem).not.toHaveBeenCalled();
            expect(fhirService.createEvolution).not.toHaveBeenCalled();
            expect(fhirService.createOrder).not.toHaveBeenCalled();
        });
    });
});
