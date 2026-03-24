import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfessionalLocation } from './professional-location.entity';
import {
    CreateProfessionalLocationDto,
    UpdateProfessionalLocationDto,
    ProfessionalLocationResponseDto,
} from './dto/professional-location.dto';
import { Professional } from './professional.entity';
import { User } from 'src/users/user.entity';


@Injectable()
export class ProfessionalLocationsService {
    constructor(
        @InjectRepository(ProfessionalLocation)
        private readonly locationRepo: Repository<ProfessionalLocation>,
        @InjectRepository(Professional)
        private readonly professionalRepo: Repository<Professional>,
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
    ) { }

    async getLocationsByProfessional(
        professionalId: string,
    ): Promise<ProfessionalLocationResponseDto[]> {
        const locations = await this.locationRepo.find({
            where: {
                professionalId,
                isActive: true,
            },
            order: {
                isMainLocation: 'DESC',
                createdAt: 'ASC',
            },
        });

        return locations.map(this.toDto);
    }

    async getLocationById(
        professionalId: string,
        locationId: string,
    ): Promise<ProfessionalLocationResponseDto> {
        const location = await this.locationRepo.findOne({
            where: {
                id: locationId,
                professionalId,
            },
        });

        if (!location) {
            throw new NotFoundException('Locación no encontrada');
        }

        return this.toDto(location);
    }

    async createLocation(
        professionalId: string,
        auth0sub: string,
        dto: CreateProfessionalLocationDto,
    ): Promise<ProfessionalLocationResponseDto> {
        const professional = await this.professionalRepo.findOne({
            where: { id: professionalId }
        })
        if (!professional) {
            throw new NotFoundException('Profesional no encontrado');
        }
        const user = await this.userRepo.findOne({
            where: { auth0Sub }
        })
        if (user?.id !== professional.userId) {
            throw new BadRequestException('No tienes permiso para crear locaciones para este profesional');
        }

        const tenantId = professional.tenantId;
        const nameExists = await this.locationRepo.exists({
            where: {
                professionalId,
                name: dto.name,
                isActive: true,
            },
        });

        if (nameExists) {
            throw new BadRequestException(`Ya existe una locación con el nombre "${dto.name}"`);
        }

        // Si es la primera locación, marcarla como principal
        const existingCount = await this.locationRepo.count({
            where: {
                professionalId,
                isActive: true,
            },
        });

        const isMainLocation =
            dto.isMainLocation === true || existingCount === 0;

        // Si es la nueva locación principal, desmarcar la anterior
        if (isMainLocation) {
            await this.locationRepo.update(
                { professionalId, isMainLocation: true, isActive: true },
                { isMainLocation: false },
            );
        }

        const location = this.locationRepo.create({
            professionalId,
            tenantId,
            ...dto,
            isMainLocation,
        });

        const saved = await this.locationRepo.save(location);
        return this.toDto(saved);
    }

    async updateLocation(
        professionalId: string,
        locationId: string,
        dto: UpdateProfessionalLocationDto,
    ): Promise<ProfessionalLocationResponseDto> {
        const location = await this.locationRepo.findOne({
            where: {
                id: locationId,
                professionalId,
            },
        });

        if (!location) {
            throw new NotFoundException('Locación no encontrada');
        }

        // Validar nombre único si se cambió
        if (dto.name && dto.name !== location.name) {
            const nameExists = await this.locationRepo.exists({
                where: {
                    professionalId,
                    name: dto.name,
                    isActive: true,
                },
            });

            if (nameExists) {
                throw new BadRequestException(
                    `Ya existe una locación con el nombre "${dto.name}"`,
                );
            }
        }

        // Si se marca como principal, desmarcar la anterior
        if (dto.isMainLocation === true && !location.isMainLocation) {
            await this.locationRepo.update(
                { professionalId, isMainLocation: true, isActive: true },
                { isMainLocation: false },
            );
        }

        Object.assign(location, dto);
        const saved = await this.locationRepo.save(location);
        return this.toDto(saved);
    }

    async deleteLocation(
        professionalId: string,
        locationId: string,
    ): Promise<void> {
        const location = await this.locationRepo.findOne({
            where: {
                id: locationId,
                professionalId,
            },
        });

        if (!location) {
            throw new NotFoundException('Locación no encontrada');
        }

        // No permitir eliminar si es la única locación activa
        const activeCount = await this.locationRepo.count({
            where: {
                professionalId,
                isActive: true,
            },
        });

        if (activeCount === 1) {
            throw new BadRequestException(
                'No se puede eliminar la única locación. Debe tener al menos una locación activa.',
            );
        }

        // Soft delete
        location.isActive = false;
        await this.locationRepo.save(location);

        // Si era la principal, marcar la más antigua como principal
        if (location.isMainLocation) {
            const nextMain = await this.locationRepo.findOne({
                where: {
                    professionalId,
                    isActive: true,
                },
                order: {
                    createdAt: 'ASC',
                },
            });

            if (nextMain) {
                nextMain.isMainLocation = true;
                await this.locationRepo.save(nextMain);
            }
        }
    }

    private toDto(entity: ProfessionalLocation): ProfessionalLocationResponseDto {
        return {
            id: entity.id,
            professionalId: entity.professionalId,
            tenantId: entity.tenantId,
            name: entity.name,
            address: entity.address,
            phone: entity.phone,
            weeklySchedule: entity.weeklySchedule,
            appointmentRules: entity.appointmentRules,
            isMainLocation: entity.isMainLocation,
            isActive: entity.isActive,
            createdAt: entity.createdAt,
            updatedAt: entity.updatedAt,
        };
    }
}
