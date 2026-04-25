import {
    Injectable,
    Logger,
    NotFoundException,
    BadRequestException,
    ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as crypto from 'crypto';
import PDFDocument from 'pdfkit';
import * as QRCode from 'qrcode';

import { ProblemBaseline } from './entities/problem-baseline.entity';
import { BaselineMedication } from './entities/baseline-medication.entity';
import { BaselineAlert } from './entities/baseline-alert.entity';
import { Prescription, PrescriptionStatus } from './entities/prescription.entity';
import { AdherenceRecord } from './entities/adherence-record.entity';
import { Problem, ProblemStatus, ProblemCategory, ProblemClinicalStatus, DecompensationStatus } from '../clinical-records/problem.entity';
import { ClinicalEvolution, RecordType } from '../clinical-records/clinical-evolution.entity';
import { ProblemTransitionEvent } from './entities/problem-transition-event.entity';
import { ArVademecumItem } from './entities/ar-vademecum-item.entity';

import { FhirService } from '../fhir/fhir.service';
import { TerminologyService } from '../fhir/terminology.service';
import { UpsertBaselineDto } from './dto/upsert-baseline.dto';
import { CreateFastTrackEvolutionDto } from './dto/create-fast-track-evolution.dto';
import {
    CreatePrescriptionDto,
    OneClickRefillDto,
    ProlongedPrescriptionPlanDto,
    SignPrescriptionDto,
    SignEvolutionDto,
    SignProblemThreadDto,
} from './dto/prescription.dto';
import { PromoteProblemDto, DiscardProblemDto } from './dto/problem-transition.dto';

// ── Auto-assessment helpers ───────────────────────────────────────────────────

export interface AutoFetchResult {
    loincCode: string;
    display: string;
    value: number | null;
    unit: string;
    effectiveDate: string;
}

export interface AutoAssessmentResult {
    text: string;
    inGoal: boolean;
    details: Array<{ goal: string; inGoal: boolean; latestValue?: number }>;
}

export interface VademecumSearchResult {
    dciName: string;
    brands: Array<{ brandName?: string; snomedCtArCode: string; snomedDisplay: string }>;
}

export interface DigitalPrescriptionDocument {
    prescriptionId: string;
    validationUrl: string;
    qrDataUrl: string;
    generatedAt: string;
    doctor: {
        professionalId: string;
        license: string;
    };
    patient: {
        id: string;
    };
    diagnosis: {
        problemId: string;
        title: string;
    };
    medication: {
        dciName: string;
        brandName?: string;
        snomedCtArCode?: string;
        displayName: string;
        dose: string;
        frequency: string;
        route: string;
        durationDays?: number;
    };
    signature: {
        provider: string;
        signedAt: string;
        hash: string;
        pfdrTransactionId?: string;
    };
}

@Injectable()
export class ChronicCareService {
    private readonly logger = new Logger(ChronicCareService.name);
    private readonly encryptionKey: string;

    constructor(
        @InjectRepository(ProblemBaseline)
        private readonly baselineRepo: Repository<ProblemBaseline>,
        @InjectRepository(BaselineMedication)
        private readonly medicationRepo: Repository<BaselineMedication>,
        @InjectRepository(BaselineAlert)
        private readonly alertRepo: Repository<BaselineAlert>,
        @InjectRepository(Prescription)
        private readonly prescriptionRepo: Repository<Prescription>,
        @InjectRepository(AdherenceRecord)
        private readonly adherenceRepo: Repository<AdherenceRecord>,
        @InjectRepository(Problem)
        private readonly problemRepo: Repository<Problem>,
        @InjectRepository(ProblemTransitionEvent)
        private readonly transitionRepo: Repository<ProblemTransitionEvent>,
        @InjectRepository(ArVademecumItem)
        private readonly vademecumRepo: Repository<ArVademecumItem>,
        @InjectRepository(ClinicalEvolution)
        private readonly evolutionRepo: Repository<ClinicalEvolution>,
        private readonly fhirService: FhirService,
        private readonly terminologyService: TerminologyService,
        private readonly configService: ConfigService,
        private readonly dataSource: DataSource,
    ) {
        this.encryptionKey = this.configService.get<string>('RX_DOC_ENCRYPTION_KEY') ?? 'dev-key-change-me';
    }

    // ─────────────────────────────────────────────────────────────
    // PROBLEM TRANSITIONS (mutable thread with same ID)
    // ─────────────────────────────────────────────────────────────

    async promoteProblem(
        tenantId: string,
        performedBy: string,
        problemId: string,
        dto: PromoteProblemDto,
    ): Promise<Problem> {
        const problem = await this.problemRepo.findOne({ where: { id: problemId, tenantId } });
        if (!problem) throw new NotFoundException(`Problem ${problemId} not found`);
        this.assertProblemThreadMutable(problem);

        const previous = {
            title: problem.title,
            category: problem.category,
            clinicalStatus: problem.clinicalStatus,
        };

        const toCategory = (dto.newCategory ?? ProblemCategory.PROBLEM_LIST_ITEM) as ProblemCategory;
        const toClinicalStatus = (dto.newClinicalStatus ?? ProblemClinicalStatus.ACTIVE) as ProblemClinicalStatus;

        Object.assign(problem, {
            title: dto.newTitle,
            category: toCategory,
            clinicalStatus: toClinicalStatus,
            snomedCode: dto.snomedCode ?? problem.snomedCode,
            icd10Code: dto.icd10Code ?? problem.icd10Code,
            icd11Code: dto.icd11Code ?? problem.icd11Code,
        });

        const saved = await this.problemRepo.save(problem);

        await this.transitionRepo.save(
            this.transitionRepo.create({
                tenantId,
                problemId: saved.id,
                patientId: saved.patientId,
                transitionType: toCategory === ProblemCategory.PROBLEM_LIST_ITEM
                    ? 'promoted_to_chronic'
                    : 'reclassified',
                fromTitle: previous.title,
                toTitle: saved.title,
                fromCategory: previous.category,
                toCategory: saved.category,
                fromClinicalStatus: previous.clinicalStatus,
                toClinicalStatus: saved.clinicalStatus,
                reasonNote: dto.reasonNote,
                metadata: {
                    snomedCode: saved.snomedCode,
                    icd10Code: saved.icd10Code,
                    icd11Code: saved.icd11Code,
                },
                performedBy,
            }),
        );

        // Auto-bootstrap baseline cuando se promueve a problema longitudinal (crónico).
        if (saved.category === ProblemCategory.PROBLEM_LIST_ITEM) {
            const baseline = await this.baselineRepo.findOne({ where: { problemId: saved.id, tenantId } });
            if (!baseline) {
                await this.baselineRepo.save(
                    this.baselineRepo.create({
                        tenantId,
                        problemId: saved.id,
                        patientId: saved.patientId,
                        clinicalGoals: [],
                        goalsStructured: [],
                        autoFetchLoincCodes: [],
                        reviewedBy: performedBy,
                        reviewedAt: new Date(),
                        createdBy: performedBy,
                    }),
                );
            }
        }

        await this.syncProblemToFhir(saved).catch((err) =>
            this.logger.error(`FHIR sync failed for promoted problem ${saved.id}`, err),
        );

        return saved;
    }

    async discardProblem(
        tenantId: string,
        performedBy: string,
        problemId: string,
        dto: DiscardProblemDto,
    ): Promise<Problem> {
        const problem = await this.problemRepo.findOne({ where: { id: problemId, tenantId } });
        if (!problem) throw new NotFoundException(`Problem ${problemId} not found`);
        this.assertProblemThreadMutable(problem);

        const previous = {
            title: problem.title,
            category: problem.category,
            clinicalStatus: problem.clinicalStatus,
        };

        const today = new Date().toISOString().split('T')[0];

        Object.assign(problem, {
            status: ProblemStatus.RESOLVED,
            clinicalStatus: ProblemClinicalStatus.RESOLVED,
            resolutionDate: today,
            resolutionReason: 'diagnostic_error',
            closureSummary: dto.closureSummary,
            resolvedBy: performedBy,
            decompensationStatus: DecompensationStatus.NONE,
            decompensationResolvedAt: new Date(),
        });

        const saved = await this.problemRepo.save(problem);

        await this.transitionRepo.save(
            this.transitionRepo.create({
                tenantId,
                problemId: saved.id,
                patientId: saved.patientId,
                transitionType: 'discarded',
                fromTitle: previous.title,
                toTitle: saved.title,
                fromCategory: previous.category,
                toCategory: saved.category,
                fromClinicalStatus: previous.clinicalStatus,
                toClinicalStatus: saved.clinicalStatus,
                reasonNote: dto.reasonNote ?? dto.closureSummary,
                metadata: { resolutionReason: saved.resolutionReason },
                performedBy,
            }),
        );

        await this.syncProblemToFhir(saved).catch((err) =>
            this.logger.error(`FHIR sync failed for discarded problem ${saved.id}`, err),
        );

        return saved;
    }

    async getProblemTransitions(
        tenantId: string,
        problemId: string,
    ): Promise<ProblemTransitionEvent[]> {
        return this.transitionRepo.find({
            where: { tenantId, problemId },
            order: { createdAt: 'DESC' },
        });
    }

    // ─────────────────────────────────────────────────────────────
    // Vademecum AR (Ley 25.649 + SNOMED CT AR)
    // ─────────────────────────────────────────────────────────────

    async searchVademecum(query: string): Promise<VademecumSearchResult[]> {
        const safeQuery = query?.trim();
        if (!safeQuery || safeQuery.length < 2) return [];

        const rows = await this.vademecumRepo
            .createQueryBuilder('v')
            .where('v.active = true')
            .andWhere('(LOWER(v.dci_name) LIKE :q OR LOWER(v.brand_name) LIKE :q)', {
                q: `%${safeQuery.toLowerCase()}%`,
            })
            .orderBy('v.dci_name', 'ASC')
            .addOrderBy('v.brand_name', 'ASC')
            .limit(60)
            .getMany();

        const grouped = new Map<string, VademecumSearchResult>();
        for (const row of rows) {
            if (!grouped.has(row.dciName)) {
                grouped.set(row.dciName, { dciName: row.dciName, brands: [] });
            }
            grouped.get(row.dciName)?.brands.push({
                brandName: row.brandName,
                snomedCtArCode: row.snomedCtArCode,
                snomedDisplay: row.snomedDisplay,
            });
        }

        return [...grouped.values()];
    }

    async signEvolution(
        tenantId: string,
        evolutionId: string,
        signedBy: string,
        dto: SignEvolutionDto,
    ): Promise<ClinicalEvolution> {
        const evolution = await this.evolutionRepo.findOne({ where: { id: evolutionId, tenantId } });
        if (!evolution) throw new NotFoundException(`Evolution ${evolutionId} not found`);
        if (evolution.isLocked) return evolution;

        const hash = this.buildStableHash({
            id: evolution.id,
            patientId: evolution.patientId,
            professionalId: evolution.professionalId,
            problemId: evolution.problemId,
            subjective: evolution.subjective,
            objective: evolution.objective,
            assessment: evolution.assessment,
            plan: evolution.plan,
            evolutionDate: evolution.evolutionDate,
            evolutionTime: evolution.evolutionTime,
            doctorLicense: dto.doctorLicense,
        });

        Object.assign(evolution, {
            signatureHash: hash,
            signedAt: new Date(),
            signedBy,
            signatureProvider: dto.signatureProvider ?? 'local_hash',
            pfdrTransactionId: dto.pfdrTransactionId,
            isLocked: true,
        });

        return this.evolutionRepo.save(evolution);
    }

    async signProblemThread(
        tenantId: string,
        problemId: string,
        signedBy: string,
        dto: SignProblemThreadDto,
    ): Promise<Problem> {
        const problem = await this.problemRepo.findOne({ where: { id: problemId, tenantId } });
        if (!problem) throw new NotFoundException(`Problem ${problemId} not found`);
        if (problem.isThreadLocked) return problem;

        const evolutions = await this.evolutionRepo.find({
            where: { tenantId, problemId },
            order: { evolutionDate: 'ASC', evolutionTime: 'ASC' },
        });

        const prescriptions = await this.prescriptionRepo.find({
            where: { tenantId, problemId },
            order: { authoredOn: 'ASC' },
        });

        const hash = this.buildStableHash({
            problem: {
                id: problem.id,
                title: problem.title,
                category: problem.category,
                clinicalStatus: problem.clinicalStatus,
                snomedCode: problem.snomedCode,
                icd10Code: problem.icd10Code,
                icd11Code: problem.icd11Code,
            },
            evolutions: evolutions.map((e) => ({
                id: e.id,
                evolutionDate: e.evolutionDate,
                evolutionTime: e.evolutionTime,
                subjective: e.subjective,
                objective: e.objective,
                assessment: e.assessment,
                plan: e.plan,
                signatureHash: e.signatureHash,
            })),
            prescriptions: prescriptions.map((r) => ({
                id: r.id,
                dciName: r.dciName,
                brandName: r.brandName,
                dose: r.dose,
                frequency: r.frequency,
                signatureHash: r.signatureHash,
            })),
            doctorLicense: dto.doctorLicense,
        });

        Object.assign(problem, {
            threadSignedAt: new Date(),
            threadSignedBy: signedBy,
            threadSignatureHash: hash,
            threadSignatureProvider: dto.signatureProvider ?? 'local_hash',
            threadPfdrTransactionId: dto.pfdrTransactionId,
            isThreadLocked: true,
        });

        return this.problemRepo.save(problem);
    }

    // ─────────────────────────────────────────────────────────────
    // BASELINE
    // ─────────────────────────────────────────────────────────────

    async upsertBaseline(
        tenantId: string,
        createdBy: string,
        dto: UpsertBaselineDto,
    ): Promise<ProblemBaseline> {
        const problem = await this.problemRepo.findOne({
            where: { id: dto.problemId, tenantId },
        });
        if (!problem) throw new NotFoundException(`Problem ${dto.problemId} not found`);
        this.assertProblemThreadMutable(problem);

        // Only chronic problems can have a baseline
        if (problem.status !== ProblemStatus.CHRONIC) {
            throw new BadRequestException(
                `A baseline can only be created for problems with status 'chronic'. ` +
                `Current status: '${problem.status}'`,
            );
        }

        let baseline = await this.baselineRepo.findOne({
            where: { problemId: dto.problemId },
        });

        if (baseline) {
            // Update
            Object.assign(baseline, {
                clinicalGoals: dto.clinicalGoals ?? baseline.clinicalGoals,
                goalsStructured: dto.goalsStructured ?? baseline.goalsStructured,
                autoFetchLoincCodes: dto.autoFetchLoincCodes ?? baseline.autoFetchLoincCodes,
                sustainingTreatmentNote: dto.sustainingTreatmentNote ?? baseline.sustainingTreatmentNote,
                reviewedBy: createdBy,
                reviewedAt: new Date(),
            });
        } else {
            baseline = this.baselineRepo.create({
                tenantId,
                problemId: dto.problemId,
                patientId: dto.patientId,
                clinicalGoals: dto.clinicalGoals,
                goalsStructured: dto.goalsStructured ?? [],
                autoFetchLoincCodes: dto.autoFetchLoincCodes ?? [],
                sustainingTreatmentNote: dto.sustainingTreatmentNote,
                reviewedBy: createdBy,
                reviewedAt: new Date(),
                createdBy,
            });
        }

        return this.baselineRepo.save(baseline);
    }

    async getBaseline(tenantId: string, problemId: string): Promise<ProblemBaseline> {
        const baseline = await this.baselineRepo.findOne({
            where: { problemId, tenantId },
            relations: ['medications', 'alerts'],
        });
        if (!baseline) throw new NotFoundException(`Baseline for problem ${problemId} not found`);
        return baseline;
    }

    async addBaselineMedication(
        tenantId: string,
        problemId: string,
        data: Partial<BaselineMedication>,
    ): Promise<BaselineMedication> {
        const baseline = await this.getBaseline(tenantId, problemId);
        const med = this.medicationRepo.create({ ...data, baselineId: baseline.id, tenantId });
        return this.medicationRepo.save(med);
    }

    async addBaselineAlert(
        tenantId: string,
        problemId: string,
        data: Partial<BaselineAlert>,
    ): Promise<BaselineAlert> {
        const baseline = await this.getBaseline(tenantId, problemId);
        const alert = this.alertRepo.create({ ...data, baselineId: baseline.id, tenantId });
        return this.alertRepo.save(alert);
    }

    // ─────────────────────────────────────────────────────────────
    // FAST-TRACK EVOLUTION (Control de Rutina)
    // ─────────────────────────────────────────────────────────────

    /**
     * Creates a fast-track evolution for a chronic problem.
     *
     * If mode = 'routine_control':
     *   - Fetches the last 3 FHIR Observations for auto-fetch LOINC codes
     *   - Generates auto-assessment based on baseline goals
     *   - Allows "Sin cambios / Estable" shortcut
     *
     * If mode = 'decompensation':
     *   - Sets problem.decompensation_status = 'acute_exacerbation'
     */
    async createFastTrackEvolution(
        tenantId: string,
        dto: CreateFastTrackEvolutionDto,
    ): Promise<{
        evolution: ClinicalEvolution;
        autoFetchResults?: AutoFetchResult[];
        autoAssessment?: AutoAssessmentResult;
    }> {
        const problem = await this.problemRepo.findOne({
            where: { id: dto.problemId, tenantId },
        });
        if (!problem) throw new NotFoundException(`Problem ${dto.problemId} not found`);
        this.assertProblemThreadMutable(problem);

        let autoFetchResults: AutoFetchResult[] | undefined;
        let autoAssessment: AutoAssessmentResult | undefined;
        let objectiveText = dto.objective;
        let assessmentText = dto.assessment;

        // — Routine Control: auto-fetch vitals/labs from FHIR ————————
        if (dto.fastTrackMode === 'routine_control') {
            const baseline = await this.baselineRepo.findOne({
                where: { problemId: dto.problemId },
            }).catch(() => null);

            if (baseline?.autoFetchLoincCodes?.length) {
                autoFetchResults = await this.autoFetchLatestObservations(
                    problem.patientId,
                    baseline.autoFetchLoincCodes,
                );

                // Build objective text from auto-fetch
                if (!objectiveText && dto.noChangesSO) {
                    objectiveText = this.buildObjectiveFromAutoFetch(autoFetchResults);
                }

                // Auto-assessment: compare observations vs goals
                if (baseline.goalsStructured?.length) {
                    autoAssessment = this.evaluateGoals(baseline.goalsStructured, autoFetchResults);
                    if (!assessmentText) {
                        assessmentText = autoAssessment.text;
                    }
                }
            }

            // "Sin cambios" shortcut → pull from last evolution
            if (dto.noChangesSO && !objectiveText) {
                const lastEvolution = await this.evolutionRepo.findOne({
                    where: { problemId: dto.problemId, tenantId },
                    order: { evolutionDate: 'DESC', evolutionTime: 'DESC' },
                });
                if (lastEvolution?.objective) {
                    objectiveText = `[Sin cambios] ${lastEvolution.objective}`;
                }
            }
        }

        // — Decompensation flow ───────────────────────────────────────
        if (dto.isDecompensation || dto.fastTrackMode === 'decompensation') {
            await this.problemRepo.update(dto.problemId, {
                decompensationStatus: 'acute_exacerbation' as any,
                decompensationStartedAt: new Date() as any,
            });
        }

        // — Persist evolution ─────────────────────────────────────────
        const evolution = await this.evolutionRepo.save(
            this.evolutionRepo.create({
                tenantId,
                patientId: dto.patientId,
                professionalId: dto.professionalId,
                appointmentId: dto.appointmentId,
                problemId: dto.problemId,
                recordType: dto.recordType ?? RecordType.SOAP,
                evolutionDate: dto.evolutionDate,
                evolutionTime: dto.evolutionTime ?? new Date().toTimeString().slice(0, 5),
                subjective: dto.noChangesSO ? 'Sin cambios subjetivos' : dto.subjective,
                objective: objectiveText,
                assessment: assessmentText,
                plan: dto.plan,
                createdBy: dto.professionalId,
                isFastTrack: true as any,
                isDecompensation: !!(dto.isDecompensation || dto.fastTrackMode === 'decompensation') as any,
                fastTrackMode: dto.fastTrackMode as any,
                autoAssessment: autoAssessment?.text as any,
            }),
        );

        // Async FHIR sync (non-blocking)
        this.syncEvolutionToFhir(evolution, problem).catch((err) =>
            this.logger.error(`FHIR sync failed for fast-track evolution ${evolution.id}`, err),
        );

        return { evolution, autoFetchResults, autoAssessment };
    }

    // ─────────────────────────────────────────────────────────────
    // PRESCRIPTIONS — Vademécum + One-Click Refill
    // ─────────────────────────────────────────────────────────────

    async createPrescription(
        tenantId: string,
        dto: CreatePrescriptionDto,
    ): Promise<Prescription> {
        const problem = await this.problemRepo.findOne({ where: { id: dto.problemId, tenantId } });
        if (!problem) {
            throw new BadRequestException('Prescription must be linked to a valid problem ID');
        }
        this.assertProblemThreadMutable(problem);

        if (!dto.dciName?.trim()) {
            throw new BadRequestException('DCI (droga genérica) is mandatory by Ley 25.649');
        }

        const today = new Date().toISOString().split('T')[0];
        const authoredOn = dto.authoredOn ?? today;

        const validUntil = dto.durationDays
            ? new Date(Date.now() + dto.durationDays * 86_400_000)
                .toISOString()
                .split('T')[0]
            : undefined;

        const coding = await this.resolveMedicationCoding(dto.dciName, dto.snomedCtArCode);
        const validationToken = crypto.randomUUID();
        const validationBase = this.configService.get<string>('RX_VALIDATION_BASE_URL') ?? 'https://hce.example.ar/rx/validate';

        const rx = await this.prescriptionRepo.save(
            this.prescriptionRepo.create({
                tenantId,
                patientId: dto.patientId,
                professionalId: dto.professionalId,
                problemId: dto.problemId,
                evolutionId: dto.evolutionId,
                baselineId: dto.baselineId,
                drugName: dto.drugName,
                dciName: dto.dciName,
                brandName: dto.brandName,
                snomedCtArCode: dto.snomedCtArCode ?? coding?.code,
                rxnormCode: dto.rxnormCode,
                doctorLicense: dto.doctorLicense,
                dose: dto.dose,
                frequency: dto.frequency,
                route: dto.route ?? 'oral',
                durationDays: dto.durationDays,
                quantity: dto.quantity,
                refills: dto.refills ?? 0,
                instructions: dto.instructions,
                dispenseAsWritten: dto.dispenseAsWritten ?? false,
                status: PrescriptionStatus.ACTIVE,
                authoredOn,
                validUntil,
                validationToken,
                qrValidationUrl: `${validationBase}/${validationToken}`,
                signatureProvider: 'local_hash',
                isLocked: false,
            }),
        );

        // Async FHIR sync
        this.syncPrescriptionToFhir(rx).catch((err) =>
            this.logger.error(`FHIR sync failed for prescription ${rx.id}`, err),
        );

        return rx;
    }

    async createProlongedPrescriptionPlan(
        tenantId: string,
        dto: ProlongedPrescriptionPlanDto,
    ): Promise<Prescription[]> {
        const problem = await this.problemRepo.findOne({ where: { id: dto.problemId, tenantId } });
        if (!problem) throw new NotFoundException(`Problem ${dto.problemId} not found`);
        if (problem.category !== ProblemCategory.PROBLEM_LIST_ITEM && problem.status !== ProblemStatus.CHRONIC) {
            throw new BadRequestException('Prolonged prescriptions are only allowed for chronic problems');
        }

        const installments = dto.installments ?? 3;
        const groupId = crypto.randomUUID();
        const created: Prescription[] = [];
        const now = new Date();

        for (let i = 0; i < installments; i++) {
            const authored = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, now.getUTCDate()));
            const authoredOn = authored.toISOString().split('T')[0];

            const rx = await this.createPrescription(tenantId, {
                patientId: dto.patientId,
                professionalId: dto.professionalId,
                problemId: dto.problemId,
                evolutionId: dto.evolutionId,
                drugName: dto.drugName,
                dciName: dto.dciName,
                brandName: dto.brandName,
                snomedCtArCode: dto.snomedCtArCode,
                dose: dto.dose,
                frequency: dto.frequency,
                route: dto.route,
                durationDays: 30,
                authoredOn,
                doctorLicense: dto.doctorLicense,
            });

            await this.prescriptionRepo.update(rx.id, {
                prolongedPlanGroupId: groupId,
                installmentNumber: i + 1,
            });

            created.push({ ...rx, prolongedPlanGroupId: groupId, installmentNumber: i + 1 });
        }

        return created;
    }

    async signPrescription(
        tenantId: string,
        prescriptionId: string,
        signedBy: string,
        dto: SignPrescriptionDto,
    ): Promise<{ prescription: Prescription; document: DigitalPrescriptionDocument; pdfBase64?: string }> {
        const rx = await this.prescriptionRepo.findOne({ where: { id: prescriptionId, tenantId } });
        if (!rx) throw new NotFoundException(`Prescription ${prescriptionId} not found`);
        if (rx.isLocked) {
            const existingDoc = await this.generateDigitalPrescriptionDocument(tenantId, rx.id, 'json', dto.validationBaseUrl);
            return { prescription: rx, document: existingDoc };
        }

        const problem = await this.problemRepo.findOne({ where: { id: rx.problemId, tenantId } });
        if (!problem) throw new BadRequestException('Prescription problem linkage is broken');

        const signatureHash = this.buildStableHash({
            prescriptionId: rx.id,
            tenantId,
            patientId: rx.patientId,
            professionalId: rx.professionalId,
            doctorLicense: dto.doctorLicense,
            problemId: rx.problemId,
            diagnosisTitle: problem.title,
            dciName: rx.dciName,
            brandName: rx.brandName,
            snomedCtArCode: rx.snomedCtArCode,
            dose: rx.dose,
            frequency: rx.frequency,
            route: rx.route,
            authoredOn: rx.authoredOn,
        });

        Object.assign(rx, {
            doctorLicense: dto.doctorLicense,
            signedBy,
            signedAt: new Date(),
            signatureHash,
            signatureProvider: dto.signatureProvider ?? 'local_hash',
            pfdrTransactionId: dto.pfdrTransactionId,
            isLocked: true,
        });

        const document = await this.buildDigitalPrescriptionDocument(rx, problem, signatureHash, dto.validationBaseUrl);
        const encrypted = this.encryptPayload(document);
        rx.digitalDocumentEncrypted = encrypted;
        rx.digitalDocumentHash = this.buildStableHash(document);

        const saved = await this.prescriptionRepo.save(rx);

        if ((dto.format ?? 'json') === 'pdf') {
            const pdfBase64 = await this.buildPrescriptionPdf(document);
            return { prescription: saved, document, pdfBase64 };
        }

        return { prescription: saved, document };
    }

    async generateDigitalPrescriptionDocument(
        tenantId: string,
        prescriptionId: string,
        format: 'json' | 'pdf' = 'json',
        validationBaseUrl?: string,
    ): Promise<DigitalPrescriptionDocument> {
        const rx = await this.prescriptionRepo.findOne({ where: { id: prescriptionId, tenantId } });
        if (!rx) throw new NotFoundException(`Prescription ${prescriptionId} not found`);
        const problem = await this.problemRepo.findOne({ where: { id: rx.problemId, tenantId } });
        if (!problem) throw new NotFoundException(`Problem ${rx.problemId} not found`);

        if (rx.digitalDocumentEncrypted) {
            try {
                return this.decryptPayload<DigitalPrescriptionDocument>(rx.digitalDocumentEncrypted);
            } catch {
                // fallback and rebuild document if decryption fails
            }
        }

        const hash = rx.signatureHash ?? this.buildStableHash({
            prescriptionId: rx.id,
            dciName: rx.dciName,
            dose: rx.dose,
            frequency: rx.frequency,
        });
        const document = await this.buildDigitalPrescriptionDocument(rx, problem, hash, validationBaseUrl);
        if (format === 'pdf') {
            await this.buildPrescriptionPdf(document);
        }
        return document;
    }

    async validatePrescriptionToken(token: string) {
        const rx = await this.prescriptionRepo.findOne({ where: { validationToken: token } as any });
        if (!rx) throw new NotFoundException('Prescription validation token not found');
        const problem = await this.problemRepo.findOne({ where: { id: rx.problemId, tenantId: rx.tenantId } });

        return {
            prescriptionId: rx.id,
            tenantId: rx.tenantId,
            status: rx.status,
            signedAt: rx.signedAt,
            signatureProvider: rx.signatureProvider,
            doctorLicense: rx.doctorLicense,
            diagnosis: problem?.title,
            dciName: rx.dciName,
            brandName: rx.brandName,
            snomedCtArCode: rx.snomedCtArCode,
            hash: rx.signatureHash,
            isValid: Boolean(rx.signatureHash && rx.signedAt),
        };
    }

    /**
     * One-Click Refill: reads all active baseline medications for a problem
     * and creates fresh prescriptions for the configured supply period.
     */
    async oneClickRefill(
        tenantId: string,
        dto: OneClickRefillDto,
    ): Promise<Prescription[]> {
        const baseline = await this.baselineRepo.findOne({
            where: { problemId: dto.problemId, tenantId },
            relations: ['medications'],
        });
        if (!baseline) {
            throw new NotFoundException(`No baseline found for problem ${dto.problemId}`);
        }

        const activeMedications = baseline.medications.filter((m) => !m.stoppedAt);
        if (!activeMedications.length) {
            throw new BadRequestException('No active medications in baseline to refill');
        }

        const today = new Date().toISOString().split('T')[0];

        const created: Prescription[] = [];
        for (const med of activeMedications) {
            const rx = await this.createPrescription(tenantId, {
                patientId: dto.patientId,
                professionalId: dto.professionalId,
                problemId: dto.problemId,
                evolutionId: dto.evolutionId,
                baselineId: baseline.id,
                drugName: med.drugName,
                dciName: med.drugName,
                doctorLicense: dto.doctorLicense,
                rxnormCode: med.rxnormCode,
                dose: med.dose ?? '',
                frequency: med.frequency ?? '',
                route: med.route ?? 'oral',
                durationDays: dto.daysSupply,
                authoredOn: today,
            });

            // Tag as one-click refill and link to previous active prescription
            const lastRx = await this.prescriptionRepo.findOne({
                where: {
                    patientId: dto.patientId,
                    problemId: dto.problemId,
                    drugName: med.drugName,
                    status: PrescriptionStatus.ACTIVE,
                },
                order: { authoredOn: 'DESC' },
            });

            await this.prescriptionRepo.update(rx.id, {
                isOneClickRefill: true,
                refillDaysSupply: dto.daysSupply,
                refilledFromId: lastRx?.id,
            });

            created.push({ ...rx, isOneClickRefill: true, refillDaysSupply: dto.daysSupply });
        }

        return created;
    }

    async getPrescriptionsByProblem(
        tenantId: string,
        problemId: string,
        status?: PrescriptionStatus,
    ): Promise<Prescription[]> {
        const where: any = { tenantId, problemId };
        if (status) where.status = status;
        return this.prescriptionRepo.find({
            where,
            order: { authoredOn: 'DESC' },
        });
    }

    async cancelPrescription(
        tenantId: string,
        rxId: string,
        reason: string,
    ): Promise<Prescription> {
        const rx = await this.prescriptionRepo.findOne({ where: { id: rxId, tenantId } });
        if (!rx) throw new NotFoundException(`Prescription ${rxId} not found`);
        if (rx.isLocked) {
            throw new ConflictException('Signed prescription is immutable and cannot be cancelled in-place');
        }
        if (rx.status === PrescriptionStatus.CANCELLED) {
            throw new ConflictException('Prescription is already cancelled');
        }
        Object.assign(rx, {
            status: PrescriptionStatus.CANCELLED,
            cancelledAt: new Date(),
            cancelReason: reason,
        });
        return this.prescriptionRepo.save(rx);
    }

    // ─────────────────────────────────────────────────────────────
    // DECOMPENSATION
    // ─────────────────────────────────────────────────────────────

    async markDecompensation(
        tenantId: string,
        problemId: string,
        status: 'acute_exacerbation' | 'hospitalized' | 'resolved_decompensation' | 'none',
    ): Promise<Problem> {
        const problem = await this.problemRepo.findOne({ where: { id: problemId, tenantId } });
        if (!problem) throw new NotFoundException(`Problem ${problemId} not found`);
        this.assertProblemThreadMutable(problem);

        const update: any = { decompensationStatus: status };
        if (status !== 'none' && status !== 'resolved_decompensation') {
            update.decompensationStartedAt = new Date();
        }
        if (status === 'resolved_decompensation' || status === 'none') {
            update.decompensationResolvedAt = new Date();
        }

        await this.problemRepo.update(problemId, update);
        return { ...problem, ...update };
    }

    // ─────────────────────────────────────────────────────────────
    // ADHERENCE
    // ─────────────────────────────────────────────────────────────

    async getAdherenceSummary(
        tenantId: string,
        problemId: string,
        days = 90,
    ): Promise<{
        adherencePct: number | null;
        records: AdherenceRecord[];
        alertText: string | null;
    }> {
        const since = new Date(Date.now() - days * 86_400_000)
            .toISOString()
            .split('T')[0];

        const records = await this.adherenceRepo
            .createQueryBuilder('ar')
            .innerJoin('prescriptions', 'rx', 'rx.id = ar.prescription_id')
            .where('rx.problem_id = :problemId', { problemId })
            .andWhere('ar.tenant_id = :tenantId', { tenantId })
            .andWhere('ar.report_date >= :since', { since })
            .getMany();

        if (!records.length) return { adherencePct: null, records: [], alertText: null };

        const avgPct =
            records.reduce((sum, r) => sum + Number(r.adherencePct ?? 0), 0) / records.length;

        let alertText: string | null = null;
        if (avgPct < 50) {
            alertText = `El paciente solo retiró/tomó el ${avgPct.toFixed(0)}% de la medicación en los últimos ${days} días. Evaluar adherencia.`;
        } else if (avgPct < 80) {
            alertText = `Adherencia subóptima: ${avgPct.toFixed(0)}% en los últimos ${days} días.`;
        }

        return { adherencePct: avgPct, records, alertText };
    }

    // ─────────────────────────────────────────────────────────────
    // DASHBOARD SUMMARY (used by frontend decompensation badge)
    // ─────────────────────────────────────────────────────────────

    async getDashboardSummary(tenantId: string, patientId: string) {
        return this.dataSource.query(
            `SELECT * FROM problem_dashboard_summary
       WHERE tenant_id = $1 AND patient_id = $2
       ORDER BY decompensation_status DESC, overdue_alerts_count DESC`,
            [tenantId, patientId],
        );
    }

    // ─────────────────────────────────────────────────────────────
    // TREND HISTORY (for Flowsheet chart)
    // ─────────────────────────────────────────────────────────────

    async getTrendHistory(
        tenantId: string,
        problemId: string,
        limitDays = 180,
    ): Promise<Array<{ date: string; trend: string | null; score: number | null }>> {
        const since = new Date(Date.now() - limitDays * 86_400_000)
            .toISOString()
            .split('T')[0];

        const rows = await this.evolutionRepo
            .createQueryBuilder('ce')
            .select([
                'ce.evolution_date AS date',
                'ce.trend AS trend',
                'ce.trend_score AS score',
            ])
            .where('ce.problem_id = :problemId', { problemId })
            .andWhere('ce.tenant_id = :tenantId', { tenantId })
            .andWhere('ce.evolution_date >= :since', { since })
            .andWhere('ce.trend IS NOT NULL')
            .orderBy('ce.evolution_date', 'ASC')
            .getRawMany();

        return rows;
    }

    // ─────────────────────────────────────────────────────────────
    // PRIVATE — Auto-fetch / Goal evaluation
    // ─────────────────────────────────────────────────────────────

    /**
     * Fetches the last 3 FHIR Observations for each LOINC code.
     * Returns the most recent value per code.
     */
    private async autoFetchLatestObservations(
        patientFhirId: string,
        loincCodes: string[],
    ): Promise<AutoFetchResult[]> {
        const results: AutoFetchResult[] = [];

        for (const code of loincCodes) {
            try {
                const bundle = await this.fhirService.getResource(
                    'Observation',
                    `?patient=${patientFhirId}&code=${code}&_sort=-date&_count=3`,
                );
                const entries: any[] = bundle?.entry ?? [];
                if (entries.length) {
                    const obs = entries[0].resource;
                    results.push({
                        loincCode: code,
                        display: obs.code?.text ?? code,
                        value: obs.valueQuantity?.value ?? null,
                        unit: obs.valueQuantity?.unit ?? '',
                        effectiveDate: obs.effectiveDateTime ?? obs.effectivePeriod?.start ?? '',
                    });
                }
            } catch {
                // FHIR unavailable — skip, do not fail the call
            }
        }

        return results;
    }

    private buildObjectiveFromAutoFetch(results: AutoFetchResult[]): string {
        if (!results.length) return '';
        return results
            .map((r) =>
                r.value !== null
                    ? `${r.display}: ${r.value} ${r.unit} (${r.effectiveDate})`
                    : `${r.display}: sin dato reciente`,
            )
            .join('. ');
    }

    /** Compares auto-fetched values against structured baseline goals */
    private evaluateGoals(
        goals: Array<{
            loincCode: string;
            display: string;
            operator: string;
            targetValue: number;
            unit: string;
        }>,
        fetchResults: AutoFetchResult[],
    ): AutoAssessmentResult {
        const details: AutoAssessmentResult['details'] = [];
        let allInGoal = true;

        for (const goal of goals) {
            const obs = fetchResults.find((r) => r.loincCode === goal.loincCode);
            if (!obs || obs.value === null) {
                details.push({ goal: `${goal.display} ${goal.operator} ${goal.targetValue} ${goal.unit}`, inGoal: false });
                allInGoal = false;
                continue;
            }

            const inGoal = this.compareValue(obs.value, goal.operator, goal.targetValue);
            details.push({
                goal: `${goal.display} ${goal.operator} ${goal.targetValue} ${goal.unit}`,
                inGoal,
                latestValue: obs.value,
            });
            if (!inGoal) allInGoal = false;
        }

        const text = allInGoal
            ? 'Paciente en metas terapéuticas.'
            : `Fuera de rango en: ${details
                .filter((d) => !d.inGoal)
                .map((d) => d.goal)
                .join('; ')}.`;

        return { text, inGoal: allInGoal, details };
    }

    private compareValue(value: number, operator: string, target: number): boolean {
        switch (operator) {
            case '<': return value < target;
            case '<=': return value <= target;
            case '>': return value > target;
            case '>=': return value >= target;
            case '==': return value === target;
            default: return false;
        }
    }

    // ─────────────────────────────────────────────────────────────
    // PRIVATE — FHIR sync helpers
    // ─────────────────────────────────────────────────────────────

    private async syncEvolutionToFhir(
        evolution: ClinicalEvolution,
        problem: Problem,
    ): Promise<void> {
        await this.fhirService.createEvolution({
            patientFhirId: problem.patientId,
            practitionerFhirId: evolution.professionalId,
            tenantId: evolution.tenantId,
            evolutionDate: `${evolution.evolutionDate}T${evolution.evolutionTime}:00`,
            subjective: evolution.subjective,
            objective: evolution.objective,
            assessment: evolution.assessment,
            plan: evolution.plan,
            problemFhirId: (problem as any).fhirConditionId ?? problem.id,
            problemTitle: problem.title,
            icd10Code: problem.icd10Code,
        });
    }

    private async syncPrescriptionToFhir(rx: Prescription): Promise<void> {
        const today = new Date().toISOString().split('T')[0];
        await this.fhirService.createOrder({
            orderId: rx.id,
            patientFhirId: rx.patientId,
            practitionerFhirId: rx.professionalId,
            problemFhirId: rx.problemId,
            tenantId: rx.tenantId,
            authoredOn: rx.authoredOn ?? today,
            type: 'medication',
            status: rx.status as any,
            detail: rx.drugName,
            medicationCode: rx.rxnormCode,
            medicationDisplay: rx.drugName,
            note: rx.instructions,
        });
    }

    private async syncProblemToFhir(problem: Problem): Promise<void> {
        const id = await this.fhirService.upsertProblem(
            {
                patientFhirId: problem.patientId,
                tenantId: problem.tenantId,
                title: problem.title,
                clinicalStatus: this.mapClinicalStatusToFhir(problem.clinicalStatus),
                category: this.mapCategoryToFhir(problem.category),
                onsetDate: problem.onsetDate,
                abatementDate: problem.resolutionDate,
                closureSummary: problem.closureSummary,
                snomedCode: problem.snomedCode,
                icd10Code: problem.icd10Code,
                icd11Code: problem.icd11Code,
            },
            problem.fhirConditionId,
        );

        if (!problem.fhirConditionId && id) {
            await this.problemRepo.update(problem.id, { fhirConditionId: id });
        }
    }

    private mapCategoryToFhir(category?: ProblemCategory): 'encounter-diagnosis' | 'problem-list-item' | 'health-concern' {
        if (category === ProblemCategory.PROBLEM_LIST_ITEM) return 'problem-list-item';
        if (category === ProblemCategory.HEALTH_CONCERN) return 'health-concern';
        return 'encounter-diagnosis';
    }

    private mapClinicalStatusToFhir(status?: ProblemClinicalStatus): 'active' | 'resolved' | 'inactive' | 'recurrence' | 'remission' {
        if (status === ProblemClinicalStatus.RESOLVED) return 'resolved';
        if (status === ProblemClinicalStatus.INACTIVE) return 'inactive';
        if (status === ProblemClinicalStatus.RECURRENCE) return 'recurrence';
        if (status === ProblemClinicalStatus.REMISSION) return 'remission';
        return 'active';
    }

    private async resolveMedicationCoding(dciName: string, providedSnomed?: string) {
        if (providedSnomed) {
            return { code: providedSnomed, display: dciName };
        }

        const mapped = await this.vademecumRepo.findOne({
            where: { dciName, active: true },
            order: { brandName: 'ASC' },
        });

        if (mapped?.snomedCtArCode) {
            return { code: mapped.snomedCtArCode, display: mapped.snomedDisplay };
        }

        // Fallback to terminology lookup if local vademecum has no mapping.
        const normalized = await this.terminologyService.normalizeProblemCoding({ text: dciName, preferredSystem: 'snomed' });
        if (normalized.preferred?.system === 'snomed') {
            return { code: normalized.preferred.code, display: normalized.preferred.display };
        }

        return undefined;
    }

    private async buildDigitalPrescriptionDocument(
        rx: Prescription,
        problem: Problem,
        signatureHash: string,
        validationBaseUrl?: string,
    ): Promise<DigitalPrescriptionDocument> {
        const validationBase = validationBaseUrl
            ?? this.configService.get<string>('RX_VALIDATION_BASE_URL')
            ?? 'https://hce.example.ar/rx/validate';
        const validationUrl = `${validationBase}/${rx.validationToken}`;
        const qrDataUrl = await QRCode.toDataURL(validationUrl, { margin: 1, width: 220 });

        return {
            prescriptionId: rx.id,
            validationUrl,
            qrDataUrl,
            generatedAt: new Date().toISOString(),
            doctor: {
                professionalId: rx.professionalId,
                license: rx.doctorLicense,
            },
            patient: {
                id: rx.patientId,
            },
            diagnosis: {
                problemId: problem.id,
                title: problem.title,
            },
            medication: {
                dciName: rx.dciName,
                brandName: rx.brandName,
                snomedCtArCode: rx.snomedCtArCode,
                displayName: rx.drugName,
                dose: rx.dose,
                frequency: rx.frequency,
                route: rx.route,
                durationDays: rx.durationDays,
            },
            signature: {
                provider: rx.signatureProvider ?? 'local_hash',
                signedAt: rx.signedAt?.toISOString() ?? new Date().toISOString(),
                hash: signatureHash,
                pfdrTransactionId: rx.pfdrTransactionId,
            },
        };
    }

    private async buildPrescriptionPdf(document: DigitalPrescriptionDocument): Promise<string> {
        return new Promise((resolve, reject) => {
            const pdf = new PDFDocument({ size: 'A4', margin: 40 });
            const chunks: Buffer[] = [];
            pdf.on('data', (c) => chunks.push(c));
            pdf.on('error', reject);
            pdf.on('end', () => resolve(Buffer.concat(chunks).toString('base64')));

            pdf.fontSize(16).text('Receta Digital', { align: 'left' });
            pdf.moveDown(0.5);
            pdf.fontSize(10).text(`ID receta: ${document.prescriptionId}`);
            pdf.text(`Emitida: ${document.generatedAt}`);
            pdf.text(`Médico: ${document.doctor.professionalId}`);
            pdf.text(`Matrícula: ${document.doctor.license}`);
            pdf.moveDown(0.5);
            pdf.text(`Diagnóstico: ${document.diagnosis.title}`);
            pdf.text(`DCI: ${document.medication.dciName}`);
            if (document.medication.brandName) {
                pdf.text(`Marca: ${document.medication.brandName}`);
            }
            pdf.text(`Dosis: ${document.medication.dose}`);
            pdf.text(`Frecuencia: ${document.medication.frequency}`);
            pdf.text(`Vía: ${document.medication.route}`);
            pdf.moveDown(0.5);
            pdf.text(`Validación: ${document.validationUrl}`);
            pdf.text(`Hash firma: ${document.signature.hash}`);
            pdf.moveDown(0.5);
            pdf.image(Buffer.from(document.qrDataUrl.split(',')[1], 'base64'), { width: 120 });

            pdf.end();
        });
    }

    private encryptPayload(payload: unknown): string {
        const iv = crypto.randomBytes(12);
        const key = crypto.createHash('sha256').update(this.encryptionKey).digest();
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

        const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
        const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
        const tag = cipher.getAuthTag();

        return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
    }

    private decryptPayload<T>(encryptedPayload: string): T {
        const [ivB64, tagB64, dataB64] = encryptedPayload.split('.');
        const iv = Buffer.from(ivB64, 'base64');
        const tag = Buffer.from(tagB64, 'base64');
        const data = Buffer.from(dataB64, 'base64');
        const key = crypto.createHash('sha256').update(this.encryptionKey).digest();
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(tag);
        const decrypted = Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
        return JSON.parse(decrypted) as T;
    }

    private buildStableHash(payload: unknown): string {
        const canonical = this.canonicalize(payload);
        return crypto.createHash('sha256').update(canonical).digest('hex');
    }

    private canonicalize(value: any): string {
        if (value === null || value === undefined) return 'null';
        if (typeof value !== 'object') return JSON.stringify(value);
        if (Array.isArray(value)) {
            return `[${value.map((item) => this.canonicalize(item)).join(',')}]`;
        }
        const keys = Object.keys(value).sort();
        return `{${keys.map((k) => `${JSON.stringify(k)}:${this.canonicalize(value[k])}`).join(',')}}`;
    }

    private assertProblemThreadMutable(problem: Problem) {
        if (problem.isThreadLocked) {
            throw new ConflictException('Problem thread is digitally signed and immutable');
        }
    }
}
