import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Patient } from './patient.entity';
import { SexType } from '../../common/enums/sex-type.enum';
import { CreatePatientDto } from './dto/create-patient.dto';
import { MockRenaperService } from './mock-renaper.service';

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,
    private readonly renaperService: MockRenaperService,
  ) {}

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

    // Verify identity against RENAPER
    const identity = await this.renaperService.lookup(dto.dni, dto.sex as SexType);

    const patient = this.patientRepo.create({
      ...dto,
      firstName: identity.firstName,
      lastName: identity.lastName,
      birthDate: identity.birthDate,
      photoUrl: identity.photoUrl,
      identityVerified: identity.verified,
    });

    return this.patientRepo.save(patient);
  }

  async findById(id: string): Promise<Patient> {
    const patient = await this.patientRepo.findOne({ where: { id } });
    if (!patient) throw new NotFoundException(`Paciente ${id} no encontrado`);
    return patient;
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
    return this.renaperService.lookup(dni, sex);
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

    return this.patientRepo.save(patient);
  }

  async findAll(page = 1, limit = 20) {
    const [data, total] = await this.patientRepo.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { lastName: 'ASC', firstName: 'ASC' },
    });
    return { data, total, page, limit };
  }
}
