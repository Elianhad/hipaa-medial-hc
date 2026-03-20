import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, Between } from 'typeorm';
import { Professional } from '../professionals/professional.entity';
import { User } from '../professionals/user.entity';
import { Tenant, TenantStatus, TenantType } from './tenant.entity';
import { TenantMembership } from './tenant-membership.entity';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { Appointment } from '../appointments/appointment.entity';

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
        @InjectRepository(Appointment)
        private readonly appointmentRepo: Repository<Appointment>,
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

    /** Return high-level metrics for an organization tenant. */
    async getOrgSummary(tenantId: string): Promise<{
        activeProfessionals: number;
        todayConsultations: number;
        pendingAudit: number;
        billingInProgress: number;
    }> {
        const activeProfessionals = await this.membershipRepo.count({
            where: { tenantId, isActive: true },
        });

        const now = new Date();
        const start = new Date(now);
        start.setUTCHours(0, 0, 0, 0);
        const end = new Date(now);
        end.setUTCHours(23, 59, 59, 999);

        const todayConsultations = await this.appointmentRepo.count({
            where: { tenantId, scheduledAt: Between(start, end) },
        });

        return {
            activeProfessionals,
            todayConsultations,
            pendingAudit: 0,
            billingInProgress: 0,
        };
    }

    /** Return staff list with professional details for an organization tenant. */
    async getOrgStaffDetail(tenantId: string): Promise<{
        id: string;
        userId: string;
        name: string;
        specialty: string | null;
        role: string;
        isActive: boolean;
    }[]> {
        const memberships = await this.membershipRepo.find({
            where: { tenantId, isActive: true },
        });

        if (!memberships.length) return [];

        const userIds = memberships.map((m) => m.userId);
        const [users, professionals] = await Promise.all([
            this.userRepo.findBy({ id: In(userIds) }),
            this.professionalRepo.findBy({ userId: In(userIds) }),
        ]);

        const userById = new Map(users.map((u) => [u.id, u]));
        const profByUserId = new Map(professionals.map((p) => [p.userId, p]));

        return memberships.map((m) => {
            const user = userById.get(m.userId);
            const prof = profByUserId.get(m.userId);
            return {
                id: m.id,
                userId: m.userId,
                name: [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || 'Sin nombre',
                specialty: prof?.specialty ?? null,
                role: m.role,
                isActive: m.isActive,
            };
        });
    }
}
