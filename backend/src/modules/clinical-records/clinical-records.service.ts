import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Not, Repository } from 'typeorm';
import { ClinicalEvolution, RecordType } from './clinical-evolution.entity';
import { Problem, ProblemClinicalStatus, ProblemVerificationStatus } from './problem.entity';
import { CreateEvolutionDto } from './dto/create-evolution.dto';
import { CreateProblemWithEvolutionDto } from './dto/create-problem-with-evolution.dto';
import { FhirService } from '../fhir/fhir.service';
import { Professional } from '../professionals/professional.entity';
import { User } from '../../users/user.entity';

@Injectable()
export class ClinicalRecordsService {
  private static readonly UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  constructor(
    @InjectRepository(ClinicalEvolution)
    private readonly evolutionRepo: Repository<ClinicalEvolution>,
    @InjectRepository(Problem)
    private readonly problemRepo: Repository<Problem>,
    @InjectRepository(Professional)
    private readonly professionalRepo: Repository<Professional>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly fhirService: FhirService,
    private readonly dataSource: DataSource,
  ) {}

  // -------------------------------------------------------------------
  // Evolutions
  // -------------------------------------------------------------------

  async createEvolution(
    tenantId: string,
    createdBy: string,
    dto: CreateEvolutionDto,
  ): Promise<ClinicalEvolution> {
    const creatorUserId = await this.resolveInternalUserId(tenantId, createdBy);

    // Persist locally first
    const evolution = this.evolutionRepo.create({
      tenantId,
      createdBy: creatorUserId,
      ...dto,
    });
    const saved = await this.evolutionRepo.save(evolution);

    // Persist to AWS HealthLake asynchronously (non-blocking)
    this.syncToFhir(saved).catch((err) => {
      // Log but do not fail the request — FHIR sync can be retried
      console.error(`FHIR sync failed for evolution ${saved.id}:`, err);
    });

    return saved;
  }

  async getEvolutionsByPatient(
    tenantId: string,
    patientId: string,
    page = 1,
    limit = 20,
  ) {
    const [data, total] = await this.evolutionRepo.findAndCount({
      where: { tenantId, patientId },
      skip: (page - 1) * limit,
      take: limit,
      order: { evolutionDate: 'DESC', evolutionTime: 'DESC' },
    });
    return { data, total, page, limit };
  }

  async getEvolutionById(id: string): Promise<ClinicalEvolution> {
    const ev = await this.evolutionRepo.findOne({ where: { id } });
    if (!ev) throw new NotFoundException(`Evolution ${id} not found`);
    return ev;
  }

  // -------------------------------------------------------------------
  // Problems (HCOP)
  // -------------------------------------------------------------------

  async createProblem(
    tenantId: string,
    createdBy: string,
    dto: Partial<Problem>,
  ): Promise<Problem> {
    const creatorUserId = await this.resolveInternalUserId(tenantId, createdBy);
    const problem = this.problemRepo.create({ tenantId, createdBy: creatorUserId, ...dto });
    return this.problemRepo.save(problem);
  }

  async getProblemsByPatient(tenantId: string, patientId: string) {
    return this.problemRepo.find({
      where: { tenantId, patientId },
      order: { createdAt: 'DESC' },
    });
  }

  // -------------------------------------------------------------------
  // Duplicate check
  // -------------------------------------------------------------------

  /**
   * Busca problemas activos para el mismo paciente con el mismo código.
   * Retorna el primer problema coincidente o null.
   * Se usa para advertir al profesional durante el llenado del formulario.
   */
  async checkProblemDuplicate(
    tenantId: string,
    patientId: string,
    snomedCode?: string,
    icd10Code?: string,
    icd11Code?: string,
  ): Promise<Problem | null> {
    if (!snomedCode && !icd10Code && !icd11Code) return null;

    const activeStatuses = [
      ProblemClinicalStatus.ACTIVE,
      ProblemClinicalStatus.RECURRENCE,
      ProblemClinicalStatus.INACTIVE,
      ProblemClinicalStatus.REMISSION,
    ];

    const qb = this.problemRepo
      .createQueryBuilder('p')
      .where('p.tenantId = :tenantId', { tenantId })
      .andWhere('p.patientId = :patientId', { patientId })
      .andWhere('p.clinicalStatus IN (:...activeStatuses)', { activeStatuses });

    const conditions: string[] = [];
    const params: Record<string, string> = {};

    if (snomedCode) {
      conditions.push('p.snomedCode = :snomedCode');
      params.snomedCode = snomedCode;
    }
    if (icd10Code) {
      conditions.push('p.icd10Code = :icd10Code');
      params.icd10Code = icd10Code;
    }
    if (icd11Code) {
      conditions.push('p.icd11Code = :icd11Code');
      params.icd11Code = icd11Code;
    }

    qb.andWhere(`(${conditions.join(' OR ')})`, params);

    return qb.getOne() ?? null;
  }

  // -------------------------------------------------------------------
  // Atomic problem + initial evolution creation
  // -------------------------------------------------------------------

  /**
   * Crea un problema clínico junto con su primera evolución SOAP
   * en una única transacción de base de datos.
   *
   * Si se especifica recurrenceOfProblemId, se fuerza
   * clinicalStatus = RECURRENCE y se vincula el hilo previo.
   */
  async createProblemWithEvolution(
    tenantId: string,
    createdBy: string,
    dto: CreateProblemWithEvolutionDto,
  ): Promise<{ problem: Problem; evolution: ClinicalEvolution }> {
    const creatorUserId = await this.resolveInternalUserId(tenantId, createdBy);
    const professionalId = await this.resolveProfessionalId(tenantId, creatorUserId, dto.professionalId);

    return this.dataSource.transaction(async (manager) => {
      const problemRepo = manager.getRepository(Problem);
      const evolutionRepo = manager.getRepository(ClinicalEvolution);

      const clinicalStatus = dto.recurrenceOfProblemId
        ? ProblemClinicalStatus.RECURRENCE
        : (dto.clinicalStatus ?? ProblemClinicalStatus.ACTIVE);

      const problem = problemRepo.create({
        tenantId,
        createdBy: creatorUserId,
        patientId: dto.patientId,
        title: dto.title,
        category: dto.category,
        clinicalStatus,
        verificationStatus: dto.verificationStatus ?? ProblemVerificationStatus.PROVISIONAL,
        snomedCode: dto.snomedCode,
        icd10Code: dto.icd10Code,
        icd11Code: dto.icd11Code,
        onsetDate: dto.onsetDate,
        recurrenceOfProblemId: dto.recurrenceOfProblemId,
      });
      const savedProblem = await problemRepo.save(problem);

      const now = new Date();
      const evolutionDate = dto.evolutionDate ?? now.toISOString().split('T')[0];
      const evolutionTime = dto.evolutionTime ?? now.toTimeString().slice(0, 5);

      const evolution = evolutionRepo.create({
        tenantId,
        createdBy: creatorUserId,
        patientId: dto.patientId,
        professionalId,
        problemId: savedProblem.id,
        recordType: RecordType.SOAP,
        evolutionDate,
        evolutionTime,
        subjective: dto.subjective,
        objective: dto.objective,
        assessment: dto.assessment,
        plan: dto.plan,
      });
      const savedEvolution = await evolutionRepo.save(evolution);

      // FHIR sync no-bloqueante (outbox asincrónico)
      this.syncToFhir(savedEvolution).catch((err) =>
        console.error(`FHIR sync evolution ${savedEvolution.id}:`, err),
      );

      return { problem: savedProblem, evolution: savedEvolution };
    });
  }

  private async resolveProfessionalId(
    tenantId: string,
    internalUserId: string,
    dtoProfessionalId?: string,
  ): Promise<string> {
    const explicitProfessionalId = dtoProfessionalId?.trim();
    if (explicitProfessionalId) {
      return explicitProfessionalId;
    }

    const professional = await this.professionalRepo.findOne({
      where: { tenantId, userId: internalUserId },
    });

    if (!professional) {
      throw new ForbiddenException(
        'El usuario autenticado no tiene perfil profesional en este tenant.',
      );
    }

    return professional.id;
  }

  private async resolveInternalUserId(tenantId: string, createdBy: string): Promise<string> {
    const user = ClinicalRecordsService.UUID_PATTERN.test(createdBy)
      ? await this.userRepo.findOne({
          where: { id: createdBy, tenantId, isActive: true },
        })
      : await this.userRepo.findOne({
          where: { auth0Sub: createdBy, tenantId, isActive: true },
        });

    if (!user) {
      throw new BadRequestException(
        'No se pudo resolver el usuario interno desde la sesion autenticada.',
      );
    }

    return user.id;
  }

  // -------------------------------------------------------------------
  // Private — FHIR synchronization
  // -------------------------------------------------------------------

  private async syncToFhir(evolution: ClinicalEvolution): Promise<void> {
    if (!this.fhirService.isConfigured()) {
      return;
    }

    const result = await this.fhirService.createEvolution({
      patientFhirId: evolution.patientId,
      practitionerFhirId: evolution.professionalId,
      tenantId: evolution.tenantId,
      evolutionDate: `${evolution.evolutionDate}T${evolution.evolutionTime}:00`,
      subjective: evolution.subjective,
      objective: evolution.objective,
      assessment: evolution.assessment,
      plan: evolution.plan,
      problemFhirId: evolution.problemId,
    });

    // Update the local record with FHIR resource IDs
    await this.evolutionRepo.update(evolution.id, {
      fhirEncounterId: result.encounterId,
      fhirObservationId: result.observationIds[0],
    });
  }
}
