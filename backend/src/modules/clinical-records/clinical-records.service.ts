import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClinicalEvolution } from './clinical-evolution.entity';
import { Problem } from './problem.entity';
import { CreateEvolutionDto } from './dto/create-evolution.dto';
import { FhirService } from '../fhir/fhir.service';

@Injectable()
export class ClinicalRecordsService {
  constructor(
    @InjectRepository(ClinicalEvolution)
    private readonly evolutionRepo: Repository<ClinicalEvolution>,
    @InjectRepository(Problem)
    private readonly problemRepo: Repository<Problem>,
    private readonly fhirService: FhirService,
  ) {}

  // -------------------------------------------------------------------
  // Evolutions
  // -------------------------------------------------------------------

  async createEvolution(
    tenantId: string,
    createdBy: string,
    dto: CreateEvolutionDto,
  ): Promise<ClinicalEvolution> {
    // Persist locally first
    const evolution = this.evolutionRepo.create({
      tenantId,
      createdBy,
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
    const problem = this.problemRepo.create({ tenantId, createdBy, ...dto });
    return this.problemRepo.save(problem);
  }

  async getProblemsByPatient(tenantId: string, patientId: string) {
    return this.problemRepo.find({
      where: { tenantId, patientId },
      order: { createdAt: 'DESC' },
    });
  }

  // -------------------------------------------------------------------
  // Private — FHIR synchronization
  // -------------------------------------------------------------------

  private async syncToFhir(evolution: ClinicalEvolution): Promise<void> {
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
