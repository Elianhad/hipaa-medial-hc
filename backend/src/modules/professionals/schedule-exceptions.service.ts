import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { UsersService } from 'src/users/users.service';
import { UserRole } from 'src/common/enums/user-role.enum';
import { Professional } from './professional.entity';
import { ProfessionalLocation } from './professional-location.entity';
import { ScheduleException } from './schedule-exception.entity';
import { CreateScheduleExceptionDto } from './dto/create-schedule-exception.dto';

@Injectable()
export class ScheduleExceptionsService {
    constructor(
        @InjectRepository(ScheduleException)
        private readonly exceptionRepo: Repository<ScheduleException>,
        @InjectRepository(Professional)
        private readonly professionalRepo: Repository<Professional>,
        @InjectRepository(ProfessionalLocation)
        private readonly locationRepo: Repository<ProfessionalLocation>,
        private readonly usersService: UsersService,
    ) { }

    async createException(
        professionalId: string,
        auth0Sub: string,
        dto: CreateScheduleExceptionDto,
    ): Promise<ScheduleException> {
        const professional = await this.getProfessionalOrThrow(professionalId);
        await this.assertCanManageExceptions(professional, auth0Sub);

        if (dto.endDate.getTime() <= dto.startDate.getTime()) {
            throw new BadRequestException('La fecha de fin debe ser posterior a la de inicio');
        }

        const locationId = dto.locationId ?? null;
        if (locationId) {
            await this.assertLocationBelongsToProfessional(professionalId, locationId);
        }

        await this.assertNoOverlappingExceptions(professionalId, dto.startDate, dto.endDate);

        const created = this.exceptionRepo.create({
            professionalId,
            locationId,
            startDate: dto.startDate,
            endDate: dto.endDate,
            reason: dto.reason.trim(),
        });

        return this.exceptionRepo.save(created);
    }

    async getFutureExceptions(
        professionalId: string,
        auth0Sub: string,
    ): Promise<ScheduleException[]> {
        const professional = await this.getProfessionalOrThrow(professionalId);
        await this.assertCanManageExceptions(professional, auth0Sub);

        return this.exceptionRepo.find({
            where: {
                professionalId,
                endDate: MoreThanOrEqual(new Date()),
            },
            order: {
                startDate: 'ASC',
            },
        });
    }

    async deleteException(
        professionalId: string,
        exceptionId: string,
        auth0Sub: string,
    ): Promise<void> {
        const professional = await this.getProfessionalOrThrow(professionalId);
        await this.assertCanManageExceptions(professional, auth0Sub);

        const exception = await this.exceptionRepo.findOne({
            where: {
                id: exceptionId,
                professionalId,
            },
        });

        if (!exception) {
            throw new NotFoundException('Excepción de horario no encontrada');
        }

        await this.exceptionRepo.remove(exception);
    }

    private async getProfessionalOrThrow(professionalId: string): Promise<Professional> {
        const professional = await this.professionalRepo.findOne({ where: { id: professionalId } });

        if (!professional) {
            throw new NotFoundException('Profesional no encontrado');
        }

        return professional;
    }

    private async assertLocationBelongsToProfessional(
        professionalId: string,
        locationId: string,
    ): Promise<void> {
        const location = await this.locationRepo.findOne({
            where: {
                id: locationId,
                professionalId,
                isActive: true,
            },
        });

        if (!location) {
            throw new BadRequestException('La locación indicada no pertenece al profesional');
        }
    }

    private async assertNoOverlappingExceptions(
        professionalId: string,
        startDate: Date,
        endDate: Date,
    ): Promise<void> {
        const overlapExists = await this.exceptionRepo
            .createQueryBuilder('exception')
            .where('exception.professional_id = :professionalId', { professionalId })
            .andWhere('exception.start_date <= :endDate', { endDate })
            .andWhere('exception.end_date >= :startDate', { startDate })
            .getExists();

        if (overlapExists) {
            throw new BadRequestException('Ya existe una excepción de horario que se superpone en ese rango');
        }
    }

    private async assertCanManageExceptions(
        professional: Professional,
        auth0Sub: string,
    ): Promise<void> {
        const requester = await this.usersService.findByAuth0Id(auth0Sub);

        if (!requester) {
            throw new NotFoundException('Usuario autenticado no encontrado');
        }

        const isOwner = requester.id === professional.userId;
        if (isOwner) {
            return;
        }

        await this.usersService.assertTenantMembership(requester.id, professional.tenantId);

        const isTenantAdmin = [UserRole.SuperAdmin, UserRole.OrgAdmin, UserRole.TenantOrg].includes(
            requester.role,
        );

        if (!isTenantAdmin) {
            throw new ForbiddenException(
                'No tienes permiso para gestionar excepciones de horario de este profesional',
            );
        }
    }
}
