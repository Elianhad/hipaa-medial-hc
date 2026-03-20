import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Professional } from '../professionals/professional.entity';
import { User } from '../professionals/user.entity';
import { Tenant, TenantStatus, TenantType } from './tenant.entity';
import { TenantMembership } from './tenant-membership.entity';
import { CreateTenantDto } from './dto/create-tenant.dto';

@Injectable()
export class TenantsService {
    constructor(
        @InjectRepository(Tenant)
        private readonly tenantRepo: Repository<Tenant>,
        @InjectRepository(TenantMembership)
        private readonly membershipRepo: Repository<TenantMembership>,
        @InjectRepository(Professional)
        private readonly professionalRepo: Repository<Professional>,
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
    ) { }

    /** Resolve a subdomain to its tenant record (used by public booking pages). */
    async findBySubdomain(subdomain: string): Promise<Record<string, unknown>> {
        const tenant = await this.tenantRepo.findOne({
            where: { subdomain, status: TenantStatus.ACTIVE },
        });
        if (!tenant) {
            throw new NotFoundException(`Tenant with subdomain "${subdomain}" not found`);
        }

        if (tenant.type === TenantType.INDEPENDENT) {
            const professional = await this.professionalRepo.findOne({
                where: { tenantId: tenant.id, isPublic: true },
            });

            const user = professional
                ? await this.userRepo.findOne({ where: { id: professional.userId } })
                : null;

            const professionalName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
            const specialty = professional?.specialty ?? String(tenant.settings?.specialty ?? '');
            const fallbackConsultationFee = Number(tenant.settings?.consultationFee ?? 0);
            const consultationFee = professional?.consultationFee ?? (fallbackConsultationFee || null);

            return {
                id: tenant.id,
                type: tenant.type,
                subdomain: tenant.subdomain,
                name: professionalName || tenant.name,
                tenantName: tenant.name,
                specialty: specialty || null,
                bio: professional?.bio ?? null,
                photoUrl: professional?.photoUrl ?? null,
                logoUrl: tenant.logoUrl,
                consultationFee,
                settings: tenant.settings,
            };
        }

        return {
            id: tenant.id,
            type: tenant.type,
            name: tenant.name,
            subdomain: tenant.subdomain,
            logoUrl: tenant.logoUrl,
            settings: tenant.settings,
            createdAt: tenant.createdAt,
            updatedAt: tenant.updatedAt,
        };
    }

    async findById(id: string): Promise<Tenant> {
        const tenant = await this.tenantRepo.findOne({ where: { id } });
        if (!tenant) throw new NotFoundException(`Tenant ${id} not found`);
        return tenant;
    }

    async create(dto: CreateTenantDto): Promise<Tenant> {
        const tenant = this.tenantRepo.create(dto);
        return this.tenantRepo.save(tenant);
    }

    /** List active members (professionals) of an organization tenant. */
    async findMembers(tenantId: string): Promise<TenantMembership[]> {
        return this.membershipRepo.find({
            where: { tenantId, isActive: true },
        });
    }

    /** Add a professional as a member of an organization tenant. */
    async addMember(
        tenantId: string,
        userId: string,
        role: 'admin' | 'staff' = 'staff',
    ): Promise<TenantMembership> {
        const existing = await this.membershipRepo.findOne({ where: { tenantId, userId } });
        if (existing) {
            existing.isActive = true;
            existing.role = role as TenantMembership['role'];
            return this.membershipRepo.save(existing);
        }
        const membership = this.membershipRepo.create({ tenantId, userId, role: role as TenantMembership['role'] });
        return this.membershipRepo.save(membership);
    }
}
