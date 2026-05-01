import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Patient } from './patient.entity';
import { SexType } from '../../common/enums/sex-type.enum';
import { CreatePatientDto } from './dto/create-patient.dto';
import { MockRenaperService, RenaperIdentityData } from './mock-renaper.service';
import { FhirService } from '../fhir/fhir.service';

/** Maps local SexType enum to FHIR R4 AdministrativeGender. */
function toFhirGender(sex: SexType): 'male' | 'female' | 'other' | 'unknown' {
  if (sex === SexType.M) return 'male';
  if (sex === SexType.F) return 'female';
  return 'other';
}

@Injectable()
export class PatientsService {
  private readonly logger = new Logger(PatientsService.name);

  constructor(
    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,
    private readonly renaperService: MockRenaperService,
    @Optional()
    private readonly fhirService?: FhirService,
  ) { }

  private shouldBypassPatientValidation(): boolean {
    return process.env.DEV_BYPASS_PATIENT_IDENTITY_VALIDATION === 'true';
  }

  private getBypassIdentity(dni: string, sex: SexType): RenaperIdentityData {
    return {
      firstName: 'Paciente',
      lastName: `DNI ${dni}`,
      birthDate: '1990-01-01',
      photoUrl: `https://via.placeholder.com/200x200.png?text=DNI+${dni}`,
      verified: true,
    };
  }

  /**
   * Register a new patient.
   *
   * Steps:
   *  1. Calls MockRENAPERService to verify identity from DNI + sex.
   *  2. Auto-fills: firstName, lastName, birthDate, photoUrl.
   *  3. Marks identityVerified = true.
   *  4. Persists the patient.
   */
  async create(dto: CreatePatientDto): Promise<Patient> {
    const existing = await this.patientRepo.findOne({
      where: { dni: dto.dni },
    });

    if (existing) {
      throw new ConflictException(
        `Ya existe un paciente registrado con el DNI ${dto.dni}`,
      );
    }

    let firstName = dto.firstName;
    let lastName = dto.lastName;
    let birthDate = dto.birthDate;
    let photoUrl = dto.photoUrl;
    let identityVerified = Boolean(dto.physicalDniVerified);

    if (!firstName || !lastName || !birthDate) {
      const identity = this.shouldBypassPatientValidation()
        ? this.getBypassIdentity(dto.dni, dto.sex as SexType)
        : await this.renaperService.lookup(dto.dni, dto.sex as SexType);

      firstName = identity.firstName;
      lastName = identity.lastName;
      birthDate = identity.birthDate;
      photoUrl = identity.photoUrl;
      identityVerified = identity.verified;
    }

    const patient = this.patientRepo.create({
      ...dto,
      firstName,
      lastName,
      birthDate,
      photoUrl,
      identityVerified,
    });

    const saved = await this.patientRepo.save(patient);
    this.syncToFhir(saved);
    return saved;
  }

  async update(id: string, dto: Partial<CreatePatientDto>): Promise<Patient> {
    const patient = await this.findById(id);

    // Locked fields — cannot be updated after identity verification
    if (patient.identityVerified) {
      const { firstName, lastName, birthDate, photoUrl, ...safeDto } = dto as any;
      Object.assign(patient, safeDto);
    } else {
      Object.assign(patient, dto);
    }

    const saved = await this.patientRepo.save(patient);
    this.syncToFhir(saved);
    return saved;
  }

  async findByDni(dni: string): Promise<Patient> {
    const patient = await this.patientRepo.findOne({ where: { dni } });
    if (!patient)
      throw new NotFoundException(`Paciente con DNI ${dni} no encontrado`);
    return patient;
  }

  /**
   * Returns RENAPER identity preview without creating a patient.
   * Used by the frontend to auto-fill and lock identity fields.
   */
  async verifyIdentity(
    dni: string,
    sex: SexType,
  ) {
    if (this.shouldBypassPatientValidation()) {
      return this.getBypassIdentity(dni, sex);
    }

    return this.renaperService.lookup(dni, sex);
  }

  async findById(id: string): Promise<Patient> {
    const patient = await this.patientRepo.findOne({ where: { id } });
    if (!patient) throw new NotFoundException(`Paciente ${id} no encontrado`);
    return patient;
  }

  async findAll(page = 1, limit = 20) {
    const [data, total] = await this.patientRepo.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { lastName: 'ASC', firstName: 'ASC' },
    });
    return { data, total, page, limit };
  }

  /**
   * Best-effort FHIR sync. Runs fire-and-forget after local persistence.
   * On Medplum failure the patient record is preserved; the missing fhirId
   * can be backfilled by a future sync or the outbox worker.
   */
  private syncToFhir(patient: Patient): void {
    if (!this.fhirService?.isConfigured()) return;

    this.fhirService
      .upsertPatient({
        patientId: patient.id,
        fhirId: patient.fhirId ?? undefined,
        dni: patient.dni,
        firstName: patient.firstName,
        lastName: patient.lastName,
        birthDate: patient.birthDate,
        sex: toFhirGender(patient.sex),
        email: patient.email ?? undefined,
        phone: patient.phone ?? undefined,
      })
      .then(async (fhirId) => {
        if (!fhirId || patient.fhirId === fhirId) return;
        await this.patientRepo.update({ id: patient.id }, { fhirId });
        this.logger.log(`Patient ${patient.id} synced to FHIR: fhirId=${fhirId}`);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `FHIR sync skipped for patient ${patient.id}: ${message}. ` +
          'Patient was persisted locally and will retry on next update.',
        );
      });
  }
}
