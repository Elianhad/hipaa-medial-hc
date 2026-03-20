import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Professional } from './professional.entity';
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { MockSisaService } from './mock-sisa.service';
import { UpdateProfessionalConfigDto } from './dto/update-professional-config.dto';

@Injectable()
export class ProfessionalsService {
  constructor(
    @InjectRepository(Professional)
    private readonly professionalRepo: Repository<Professional>,
    private readonly sisaService: MockSisaService,
  ) { }

  /**
   * Register a new professional.
   *
   * Steps:
   *  1. Calls MockSisaService to verify the license number (matrícula) against SISA.
   *  2. Checks that the license status is ACTIVO — rejects SUSPENDIDO / INACTIVO.
   *  3. Auto-fills: firstName, lastName, specialty, professionalType from SISA data.
   *  4. Marks sisaVerified = true.
   *  5. Persists the professional record.
   */
  async create(dto: CreateProfessionalDto): Promise<Professional> {
    const existing = await this.professionalRepo.findOne({
      where: { licenseNumber: dto.licenseNumber },
    });

    if (existing) {
      throw new ConflictException(
        `Ya existe un profesional registrado con la matrícula ${dto.licenseNumber}`,
      );
    }

    // Verify license against SISA
    const licenseData = await this.sisaService.lookup(dto.licenseNumber);

    if (licenseData.licenseStatus !== 'ACTIVO') {
      throw new BadRequestException(
        `SISA: La matrícula ${dto.licenseNumber} se encuentra en estado ` +
        `${licenseData.licenseStatus}. Solo se permiten matrículas ACTIVAS.`,
      );
    }

    const professional = this.professionalRepo.create({
      ...dto,
      specialty: licenseData.specialty,
      professionalType: licenseData.professionalType,
      sisaVerified: licenseData.verified,
    });

    return this.professionalRepo.save(professional);
  }

  async findById(id: string): Promise<Professional> {
    const professional = await this.professionalRepo.findOne({ where: { id } });
    if (!professional) {
      throw new NotFoundException(`Profesional ${id} no encontrado`);
    }
    return professional;
  }

  async findByLicenseNumber(licenseNumber: string): Promise<Professional> {
    const professional = await this.professionalRepo.findOne({
      where: { licenseNumber },
    });
    if (!professional) {
      throw new NotFoundException(
        `Profesional con matrícula ${licenseNumber} no encontrado`,
      );
    }
    return professional;
  }

  /**
   * Returns SISA license preview without creating a professional.
   * Used by the frontend to auto-fill and lock license fields.
   */
  async verifyLicense(licenseNumber: string) {
    return this.sisaService.lookup(licenseNumber);
  }

  async findAll(page = 1, limit = 20) {
    const [data, total] = await this.professionalRepo.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    return { data, total, page, limit };
  }

  async getConfig(id: string) {
    const professional = await this.findById(id);

    return {
      id: professional.id,
      specialty: professional.specialty,
      bio: professional.bio,
      photoUrl: professional.photoUrl,
      consultationFee: professional.consultationFee,
      isPublic: professional.isPublic,
      acceptedInsurances: professional.scheduleConfig?.acceptedInsurances ?? [],
      weeklySchedule: professional.scheduleConfig?.weeklySchedule ?? {},
      appointmentRules: professional.scheduleConfig?.appointmentRules ?? {},
      scheduleConfig: professional.scheduleConfig,
    };
  }

  async updateConfig(id: string, dto: UpdateProfessionalConfigDto) {
    const professional = await this.findById(id);

    if (dto.specialty !== undefined) {
      professional.specialty = dto.specialty;
    }
    if (dto.bio !== undefined) {
      professional.bio = dto.bio;
    }
    if (dto.photoUrl !== undefined) {
      professional.photoUrl = dto.photoUrl;
    }
    if (dto.consultationFee !== undefined) {
      professional.consultationFee = dto.consultationFee;
    }
    if (dto.isPublic !== undefined) {
      professional.isPublic = dto.isPublic;
    }

    const currentConfig = professional.scheduleConfig ?? {};
    professional.scheduleConfig = {
      ...currentConfig,
      acceptedInsurances: dto.acceptedInsurances ?? currentConfig.acceptedInsurances ?? [],
      weeklySchedule: dto.weeklySchedule ?? currentConfig.weeklySchedule ?? {},
      appointmentRules: dto.appointmentRules ?? currentConfig.appointmentRules ?? {},
    };

    const saved = await this.professionalRepo.save(professional);
    return this.getConfig(saved.id);
  }
}
