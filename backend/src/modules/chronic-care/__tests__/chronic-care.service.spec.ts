import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ChronicCareService } from '../chronic-care.service';
import { ProblemBaseline } from '../entities/problem-baseline.entity';
import { BaselineMedication } from '../entities/baseline-medication.entity';
import { BaselineAlert } from '../entities/baseline-alert.entity';
import { Prescription, PrescriptionStatus } from '../entities/prescription.entity';
import { AdherenceRecord } from '../entities/adherence-record.entity';
import { ProblemTransitionEvent } from '../entities/problem-transition-event.entity';
import { ArVademecumItem } from '../entities/ar-vademecum-item.entity';
import { Problem, ProblemStatus, ProblemCategory, ProblemClinicalStatus } from '../../clinical-records/problem.entity';
import { ClinicalEvolution, RecordType } from '../../clinical-records/clinical-evolution.entity';
import { FhirService } from '../../fhir/fhir.service';
import { TerminologyService } from '../../fhir/terminology.service';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRepo<T>(overrides: Partial<Record<string, jest.Mock>> = {}) {
    return {
        findOne: jest.fn(),
        find: jest.fn(),
        findAndCount: jest.fn(),
        create: jest.fn((data) => data),
        save: jest.fn(async (data) => ({ id: 'uuid-saved', ...data })),
        update: jest.fn(),
        createQueryBuilder: jest.fn(),
        ...overrides,
    };
}

const mockFhirService: Partial<FhirService> = {
    createEvolution: jest.fn().mockResolvedValue({
        encounterId: 'enc-001',
        clinicalImpressionId: 'ci-001',
        observationIds: [],
    }),
    createOrder: jest.fn().mockResolvedValue({ id: 'rx-fhir-001', resourceType: 'MedicationRequest' }),
    getResource: jest.fn().mockResolvedValue({ entry: [] }),
    upsertProblem: jest.fn().mockResolvedValue('cond-001'),
};

const mockDataSource = {
    query: jest.fn().mockResolvedValue([]),
    transaction: jest.fn(async (cb) => cb({ query: jest.fn() })),
} as unknown as DataSource;

// ─────────────────────────────────────────────────────────────────────────────

describe('ChronicCareService', () => {
    let service: ChronicCareService;
    let baselineRepo: ReturnType<typeof makeRepo>;
    let medicationRepo: ReturnType<typeof makeRepo>;
    let alertRepo: ReturnType<typeof makeRepo>;
    let prescriptionRepo: ReturnType<typeof makeRepo>;
    let adherenceRepo: ReturnType<typeof makeRepo>;
    let transitionRepo: ReturnType<typeof makeRepo>;
    let vademecumRepo: ReturnType<typeof makeRepo>;
    let problemRepo: ReturnType<typeof makeRepo>;
    let evolutionRepo: ReturnType<typeof makeRepo>;

    const mockTerminologyService = {
        normalizeProblemCoding: jest.fn().mockResolvedValue({ preferred: undefined }),
    };
    const mockConfigService = {
        get: jest.fn((key: string) => {
            if (key === 'RX_DOC_ENCRYPTION_KEY') return 'test-key';
            if (key === 'RX_VALIDATION_BASE_URL') return 'https://example.test/validate';
            return undefined;
        }),
    };

    beforeEach(async () => {
        baselineRepo = makeRepo();
        medicationRepo = makeRepo();
        alertRepo = makeRepo();
        prescriptionRepo = makeRepo();
        adherenceRepo = makeRepo();
        transitionRepo = makeRepo();
        vademecumRepo = makeRepo();
        problemRepo = makeRepo();
        evolutionRepo = makeRepo();

        const module = await Test.createTestingModule({
            providers: [
                ChronicCareService,
                { provide: getRepositoryToken(ProblemBaseline), useValue: baselineRepo },
                { provide: getRepositoryToken(BaselineMedication), useValue: medicationRepo },
                { provide: getRepositoryToken(BaselineAlert), useValue: alertRepo },
                { provide: getRepositoryToken(Prescription), useValue: prescriptionRepo },
                { provide: getRepositoryToken(AdherenceRecord), useValue: adherenceRepo },
                { provide: getRepositoryToken(ProblemTransitionEvent), useValue: transitionRepo },
                { provide: getRepositoryToken(ArVademecumItem), useValue: vademecumRepo },
                { provide: getRepositoryToken(Problem), useValue: problemRepo },
                { provide: getRepositoryToken(ClinicalEvolution), useValue: evolutionRepo },
                { provide: FhirService, useValue: mockFhirService },
                { provide: TerminologyService, useValue: mockTerminologyService },
                { provide: ConfigService, useValue: mockConfigService },
                { provide: DataSource, useValue: mockDataSource },
            ],
        }).compile();

        service = module.get(ChronicCareService);
    });

    // ─── upsertBaseline ────────────────────────────────────────────────────────

    describe('upsertBaseline', () => {
        it('throws NotFoundException when problem does not exist', async () => {
            problemRepo.findOne.mockResolvedValue(null);
            await expect(
                service.upsertBaseline('tenant-1', 'prof-1', {
                    problemId: 'p-1',
                    patientId: 'pat-1',
                    clinicalGoals: ['TA < 140'],
                }),
            ).rejects.toThrow(NotFoundException);
        });

        it('throws BadRequestException for non-chronic problems', async () => {
            problemRepo.findOne.mockResolvedValue({
                id: 'p-1',
                status: ProblemStatus.ACTIVE,
            });
            await expect(
                service.upsertBaseline('tenant-1', 'prof-1', {
                    problemId: 'p-1',
                    patientId: 'pat-1',
                }),
            ).rejects.toThrow(BadRequestException);
        });

        it('creates a new baseline for a chronic problem', async () => {
            problemRepo.findOne.mockResolvedValue({ id: 'p-1', status: ProblemStatus.CHRONIC });
            baselineRepo.findOne.mockResolvedValue(null);

            const result = await service.upsertBaseline('tenant-1', 'prof-1', {
                problemId: 'p-1',
                patientId: 'pat-1',
                clinicalGoals: ['TA sistólica < 140 mmHg'],
                autoFetchLoincCodes: ['8480-6'],
            });

            expect(baselineRepo.save).toHaveBeenCalled();
            expect(result).toHaveProperty('id');
        });

        it('updates an existing baseline', async () => {
            problemRepo.findOne.mockResolvedValue({ id: 'p-1', status: ProblemStatus.CHRONIC });
            const existing = {
                problemId: 'p-1',
                clinicalGoals: ['old goal'],
                goalsStructured: [],
                autoFetchLoincCodes: [],
            };
            baselineRepo.findOne.mockResolvedValue(existing);

            await service.upsertBaseline('tenant-1', 'prof-1', {
                problemId: 'p-1',
                patientId: 'pat-1',
                clinicalGoals: ['TA sistólica < 140 mmHg'],
            });

            expect(baselineRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({ clinicalGoals: ['TA sistólica < 140 mmHg'] }),
            );
        });
    });

    // ─── createPrescription ────────────────────────────────────────────────────

    describe('createPrescription', () => {
        it('creates a prescription linked to problem with DCI', async () => {
            problemRepo.findOne.mockResolvedValue({ id: 'p-1', tenantId: 'tenant-1', isThreadLocked: false });
            vademecumRepo.findOne.mockResolvedValue({ snomedCtArCode: '386872004', snomedDisplay: 'Enalapril (substance)' });

            const dto = {
                patientId: 'pat-1',
                professionalId: 'prof-1',
                problemId: 'p-1',
                drugName: 'Enalapril',
                dciName: 'Enalapril',
                doctorLicense: 'MN 123456',
                dose: '10 mg',
                frequency: 'cada 12 h',
                route: 'oral',
                durationDays: 30,
            };

            const rx = await service.createPrescription('tenant-1', dto);

            expect(prescriptionRepo.save).toHaveBeenCalled();
            expect(rx).toHaveProperty('validationToken');
        });

        it('sets status to ACTIVE by default', async () => {
            problemRepo.findOne.mockResolvedValue({ id: 'p-1', tenantId: 'tenant-1', isThreadLocked: false });
            vademecumRepo.findOne.mockResolvedValue(null);
            await service.createPrescription('tenant-1', {
                patientId: 'pat-1',
                professionalId: 'prof-1',
                problemId: 'p-1',
                drugName: 'Metformina',
                dciName: 'Metformina',
                doctorLicense: 'MN 123456',
                dose: '500 mg',
                frequency: 'con las comidas',
            });

            const callArg = prescriptionRepo.create.mock.calls[0][0];
            expect(callArg.status).toBe(PrescriptionStatus.ACTIVE);
        });
    });

    // ─── oneClickRefill ────────────────────────────────────────────────────────

    describe('oneClickRefill', () => {
        it('throws NotFoundException when no baseline exists', async () => {
            baselineRepo.findOne.mockResolvedValue(null);
            await expect(
                service.oneClickRefill('tenant-1', {
                    patientId: 'pat-1',
                    professionalId: 'prof-1',
                    doctorLicense: 'MN 123456',
                    problemId: 'p-1',
                    daysSupply: 30,
                }),
            ).rejects.toThrow(NotFoundException);
        });

        it('throws BadRequestException when no active medications', async () => {
            baselineRepo.findOne.mockResolvedValue({
                id: 'bl-1',
                problemId: 'p-1',
                medications: [{ drugName: 'Enalapril', stoppedAt: '2025-01-01' }],
            });
            await expect(
                service.oneClickRefill('tenant-1', {
                    patientId: 'pat-1',
                    professionalId: 'prof-1',
                    doctorLicense: 'MN 123456',
                    problemId: 'p-1',
                    daysSupply: 30,
                }),
            ).rejects.toThrow(BadRequestException);
        });

        it('generates one prescription per active baseline medication', async () => {
            baselineRepo.findOne.mockResolvedValue({
                id: 'bl-1',
                problemId: 'p-1',
                medications: [
                    { drugName: 'Enalapril', dose: '10 mg', frequency: 'cada 12 h', route: 'oral', stoppedAt: null },
                    { drugName: 'Amlodipina', dose: '5 mg', frequency: 'una vez al día', route: 'oral', stoppedAt: null },
                ],
            });
            prescriptionRepo.findOne.mockResolvedValue(null);
            problemRepo.findOne.mockResolvedValue({ id: 'p-1', tenantId: 'tenant-1', isThreadLocked: false });
            vademecumRepo.findOne.mockResolvedValue(null);

            const result = await service.oneClickRefill('tenant-1', {
                patientId: 'pat-1',
                professionalId: 'prof-1',
                doctorLicense: 'MN 123456',
                problemId: 'p-1',
                daysSupply: 30,
            });

            expect(result).toHaveLength(2);
            expect(result[0]).toMatchObject({ isOneClickRefill: true, refillDaysSupply: 30 });
        });
    });

    // ─── markDecompensation ────────────────────────────────────────────────────

    describe('markDecompensation', () => {
        it('throws NotFoundException for unknown problem', async () => {
            problemRepo.findOne.mockResolvedValue(null);
            await expect(
                service.markDecompensation('tenant-1', 'p-1', 'acute_exacerbation'),
            ).rejects.toThrow(NotFoundException);
        });

        it('sets decompensation status and timestamps correctly', async () => {
            const problem = { id: 'p-1', tenantId: 'tenant-1', title: 'HTA' };
            problemRepo.findOne.mockResolvedValue(problem);
            problemRepo.update.mockResolvedValue({ affected: 1 });

            const result = await service.markDecompensation('tenant-1', 'p-1', 'acute_exacerbation');

            expect(problemRepo.update).toHaveBeenCalledWith(
                'p-1',
                expect.objectContaining({
                    decompensationStatus: 'acute_exacerbation',
                    decompensationStartedAt: expect.any(Date),
                }),
            );
            expect(result.decompensationStatus).toBe('acute_exacerbation');
        });
    });

    // ─── evaluateGoals (via createFastTrackEvolution) ─────────────────────────

    describe('goal evaluation in fast-track evolution', () => {
        it('returns "en metas" assessment when all observations meet targets', async () => {
            const problem = {
                id: 'p-1', tenantId: 'tenant-1', status: ProblemStatus.CHRONIC,
                patientId: 'pat-1', icd10Code: 'I10', title: 'HTA',
            };
            problemRepo.findOne.mockResolvedValue(problem);

            baselineRepo.findOne.mockResolvedValue({
                id: 'bl-1',
                autoFetchLoincCodes: ['8480-6'],
                goalsStructured: [
                    { loincCode: '8480-6', display: 'TA sistólica', operator: '<', targetValue: 140, unit: 'mmHg' },
                ],
            });

            // FHIR returns TA sistólica = 128 → below 140 → in goal
            (mockFhirService.getResource as jest.Mock).mockResolvedValue({
                entry: [
                    {
                        resource: {
                            code: { text: 'TA sistólica' },
                            valueQuantity: { value: 128, unit: 'mmHg' },
                            effectiveDateTime: '2025-03-01',
                        },
                    },
                ],
            });

            evolutionRepo.save.mockImplementation(async (data) => ({ id: 'evo-1', ...data }));

            const { autoAssessment } = await service.createFastTrackEvolution('tenant-1', {
                patientId: 'pat-1',
                professionalId: 'prof-1',
                problemId: 'p-1',
                fastTrackMode: 'routine_control',
                evolutionDate: '2025-03-20',
                evolutionTime: '10:00',
            });

            expect(autoAssessment?.inGoal).toBe(true);
            expect(autoAssessment?.text).toContain('metas terapéuticas');
        });

        it('returns "fuera de rango" when observation exceeds target', async () => {
            const problem = {
                id: 'p-1', tenantId: 'tenant-1', status: ProblemStatus.CHRONIC,
                patientId: 'pat-1', icd10Code: 'I10', title: 'HTA',
            };
            problemRepo.findOne.mockResolvedValue(problem);

            baselineRepo.findOne.mockResolvedValue({
                id: 'bl-1',
                autoFetchLoincCodes: ['8480-6'],
                goalsStructured: [
                    { loincCode: '8480-6', display: 'TA sistólica', operator: '<', targetValue: 140, unit: 'mmHg' },
                ],
            });

            (mockFhirService.getResource as jest.Mock).mockResolvedValue({
                entry: [
                    {
                        resource: {
                            code: { text: 'TA sistólica' },
                            valueQuantity: { value: 165, unit: 'mmHg' },
                            effectiveDateTime: '2025-03-01',
                        },
                    },
                ],
            });

            evolutionRepo.save.mockImplementation(async (data) => ({ id: 'evo-1', ...data }));

            const { autoAssessment } = await service.createFastTrackEvolution('tenant-1', {
                patientId: 'pat-1',
                professionalId: 'prof-1',
                problemId: 'p-1',
                fastTrackMode: 'routine_control',
                evolutionDate: '2025-03-20',
                evolutionTime: '10:00',
            });

            expect(autoAssessment?.inGoal).toBe(false);
            expect(autoAssessment?.text).toContain('Fuera de rango');
        });
    });

    // ─── transitions: promote / discard ───────────────────────────────────────

    describe('promoteProblem', () => {
        it('promotes and renames problem keeping same ID', async () => {
            const problem = {
                id: 'p-1',
                tenantId: 'tenant-1',
                patientId: 'pat-1',
                title: 'Gonalgia',
                category: 'acute',
                clinicalStatus: 'active',
                status: ProblemStatus.ACTIVE,
            };
            problemRepo.findOne.mockResolvedValue(problem);
            problemRepo.save.mockImplementation(async (data) => data);
            baselineRepo.findOne.mockResolvedValue(null);

            const result = await service.promoteProblem('tenant-1', 'prof-1', 'p-1', {
                newTitle: 'Artrosis de Rodilla',
                newCategory: ProblemCategory.PROBLEM_LIST_ITEM,
                newClinicalStatus: ProblemClinicalStatus.ACTIVE,
                reasonNote: 'Diagnóstico confirmado por imagen',
            });

            expect(result.id).toBe('p-1');
            expect(result.title).toBe('Artrosis de Rodilla');
            expect(result.category).toBe(ProblemCategory.PROBLEM_LIST_ITEM);
            expect(transitionRepo.save).toHaveBeenCalled();
        });
    });

    describe('discardProblem', () => {
        it('marks suspected problem as resolved and logs transition', async () => {
            const problem = {
                id: 'p-1',
                tenantId: 'tenant-1',
                patientId: 'pat-1',
                title: 'Hallazgo de TA elevada',
                category: 'symptomatic',
                clinicalStatus: 'active',
                status: ProblemStatus.ACTIVE,
            };

            problemRepo.findOne.mockResolvedValue(problem);
            problemRepo.save.mockImplementation(async (data) => data);

            const result = await service.discardProblem('tenant-1', 'prof-1', 'p-1', {
                closureSummary: 'HTA de bata blanca, no requiere tratamiento',
                reasonNote: 'MAPA normal',
            });

            expect(result.status).toBe(ProblemStatus.RESOLVED);
            expect(result.clinicalStatus).toBe('resolved');
            expect(result.closureSummary).toContain('bata blanca');
            expect(transitionRepo.save).toHaveBeenCalled();
        });
    });
});
