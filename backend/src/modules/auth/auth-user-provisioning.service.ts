import { BadRequestException, Injectable, Logger } from '@nestjs/common'; // Agrega Logger
import { ConfigService } from '@nestjs/config'; // Importante para leer el .env
import { ManagementClient } from 'auth0'; // El SDK de Auth0
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { extractNormalizedRoles } from '../../common/auth/role-claims';
import { UserRole } from '../../common/enums/user-role.enum';
import { User } from '../../users/user.entity';
import { UsersService } from '../../users/users.service';
import { Professional } from '../professionals/professional.entity';
import { Tenant, TenantStatus } from '../tenants/tenant.entity';
import { MemberRole, TenantMembership } from '../tenants/tenant-membership.entity';
import { TenantType } from '../tenants/tenant.entity';

export interface SyncUserInput {
    tenantId?: string;
    tenantSubdomain?: string;
}

export interface SyncUserResult {
    synced: boolean;
    created: boolean;
    reason?: string;
    userId?: string;
    tenantId?: string;
    role?: UserRole;
}

export interface RegisterUserInput {
    role: 'professional' | 'adminOrg';
    tenantName: string;
    subdomain: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    licenseNumber?: string;
    specialty?: string;
    consultationFee?: number;
}

export interface RegisterUserResult {
    registered: true;
    createdTenant: boolean;
    createdUser: boolean;
    createdProfessional: boolean;
    createdMembership: boolean;
    tenantId: string;
    userId: string;
    role: UserRole;
    professionalId?: string;
}

export interface RegistrationStatusResult {
    registered: boolean;
    needsRegistration: boolean;
    reason?: string;
    userId?: string;
    tenantId?: string;
    role?: UserRole;
    hasProfessionalProfile: boolean;
    hasOrganizationMembership: boolean;
    professionalId?: string;
}

@Injectable()
export class AuthUserProvisioningService {
    private readonly logger = new Logger(AuthUserProvisioningService.name);
    private auth0Management: ManagementClient;
    constructor(
        private readonly dataSource: DataSource,
        @InjectRepository(Professional)
        private readonly professionalRepo: Repository<Professional>,
        @InjectRepository(TenantMembership)
        private readonly membershipRepo: Repository<TenantMembership>,
        @InjectRepository(Tenant)
        private readonly tenantRepo: Repository<Tenant>,
        private readonly configService: ConfigService,
        private readonly usersService: UsersService,
    ) {
        const domain = this.configService.get<string>('AUTH0_DOMAIN') || '';
        const clientId = this.configService.get<string>('AUTH0_M2M_CLIENT_ID') || '';
        const clientSecret = this.configService.get<string>('AUTH0_M2M_CLIENT_SECRET') || '';

        this.auth0Management = new ManagementClient({
            domain,
            clientId,
            clientSecret,
        });
    }

    async registerAuthenticatedUser(
        authUser: Record<string, unknown> | undefined,
        input: RegisterUserInput,
    ): Promise<RegisterUserResult> {
        // Extraemos el sub una sola vez
        const sub = this.getStringClaim(authUser, 'sub');
        if (!sub) {
            throw new BadRequestException('Usuario no autenticado correctamente');
        }

        const role = this.resolveRegisterRole(input.role);
        const subdomain = this.normalizeSubdomain(input.subdomain);
        const tenantName = input.tenantName?.trim();
        if (!tenantName) {
            throw new BadRequestException('tenantName is required');
        }

        const email = input.email?.trim() || this.getStringClaim(authUser, 'email') || this.fallbackEmail(sub);
        const firstName = input.firstName?.trim() || this.resolveNames(authUser).firstName;
        const lastName = input.lastName?.trim() || this.resolveNames(authUser).lastName;

        // Validación temprana: si es profesional, matrícula obligatoria
        if (role === UserRole.Professional) {
            const license = input.licenseNumber?.trim();
            if (!license) {
                throw new BadRequestException('licenseNumber is required for professional registration');
            }
        }

        // ─────────────────────────────────────────────────────────────────────
        // FASE 1: Transacción de base de datos
        // La llamada a Auth0 NO está dentro de esta transacción.
        // Si Auth0 falla, la BD ya commiteó y el usuario existe localmente.
        // ─────────────────────────────────────────────────────────────────────
        const dbResult = await this.dataSource.transaction(async (manager) => {
            const tenantRepo = manager.getRepository(Tenant);
            const userRepo = manager.getRepository(User);
            const professionalRepo = manager.getRepository(Professional);
            const membershipRepo = manager.getRepository(TenantMembership);

            let createdTenant = false;
            let createdUser = false;
            let createdProfessional = false;
            let createdMembership = false;

            // ── Tenant ──────────────────────────────────────────────────────
            let tenant = await tenantRepo.findOne({ where: { subdomain } });
            if (!tenant) {
                this.logger.log(`[Register] Creando tenant '${subdomain}'...`);
                tenant = tenantRepo.create({
                    name: tenantName,
                    subdomain,
                    type: role === UserRole.OrgAdmin ? TenantType.ORGANIZATION : TenantType.INDEPENDENT,
                    status: TenantStatus.ACTIVE,
                });
                tenant = await tenantRepo.save(tenant);
                createdTenant = true;
                this.logger.log(`[Register] Tenant creado: ${tenant.id}`);
            } else {
                this.logger.log(`[Register] Tenant existente reutilizado: ${tenant.id}`);
            }

            // ── User ────────────────────────────────────────────────────────
            let user = await userRepo.findOne({ where: { auth0Sub: sub } });
            if (!user) {
                this.logger.log(`[Register] Creando User para sub=${sub}...`);
                user = userRepo.create({
                    auth0Sub: sub,
                    tenantId: tenant.id,
                    email,
                    firstName: this.toNullableName(firstName),
                    lastName: this.toNullableName(lastName),
                    role,
                    isActive: true,
                });
                user = await userRepo.save(user);
                createdUser = true;
                this.logger.log(`[Register] User creado: ${user.id}`);
            } else {
                this.logger.log(`[Register] Actualizando User existente: ${user.id}`);
                user.tenantId = tenant.id;
                user.email = email;
                user.firstName = this.toNullableName(firstName);
                user.lastName = this.toNullableName(lastName);
                user.role = role;
                user.isActive = true;
                user = await userRepo.save(user);
            }

            let professionalId: string | undefined;

            // ── Professional profile ─────────────────────────────────────────
            if (role === UserRole.Professional) {
                const licenseNumber = (input.licenseNumber ?? '').trim();
                let professional = await professionalRepo.findOne({ where: { userId: user.id } });
                if (!professional) {
                    this.logger.log(`[Register] Creando Professional para userId=${user.id}...`);
                    professional = professionalRepo.create({
                        tenantId: tenant.id,
                        userId: user.id,
                        licenseNumber,
                        specialty: input.specialty?.trim() || 'Pendiente',
                        professionalType: 'Profesional de salud',
                        professionalIdValidated: false,
                        consultationFee: input.consultationFee,
                        isPublic: true,
                    });
                    professional = await professionalRepo.save(professional);
                    createdProfessional = true;
                    this.logger.log(`[Register] Professional creado: ${professional.id}`);
                } else {
                    this.logger.log(`[Register] Actualizando Professional existente: ${professional.id}`);
                    professional.tenantId = tenant.id;
                    professional.licenseNumber = licenseNumber || professional.licenseNumber;
                    professional.specialty = input.specialty?.trim() || professional.specialty;
                    if (typeof input.consultationFee === 'number') {
                        professional.consultationFee = input.consultationFee;
                    }
                    professional = await professionalRepo.save(professional);
                }
                professionalId = professional.id;
            }

            // ── TenantMembership (para adminOrg) ────────────────────────────
            if (role === UserRole.OrgAdmin) {
                const existingMembership = await membershipRepo.findOne({
                    where: { tenantId: tenant.id, userId: user.id },
                });

                if (!existingMembership) {
                    this.logger.log(`[Register] Creando TenantMembership ADMIN para userId=${user.id}...`);
                    await membershipRepo.save(
                        membershipRepo.create({
                            tenantId: tenant.id,
                            userId: user.id,
                            role: MemberRole.ADMIN,
                            isActive: true,
                        }),
                    );
                    createdMembership = true;
                } else if (!existingMembership.isActive || existingMembership.role !== MemberRole.ADMIN) {
                    existingMembership.isActive = true;
                    existingMembership.role = MemberRole.ADMIN;
                    await membershipRepo.save(existingMembership);
                }
            }

            return {
                createdTenant,
                createdUser,
                createdProfessional,
                createdMembership,
                tenantId: tenant.id,
                userId: user.id,
                userRole: user.role,
                professionalId,
            };
        });

        // ─────────────────────────────────────────────────────────────────────
        // FASE 2: Asignación de rol en Auth0 (FUERA de la transacción)
        // Un fallo aquí NO revierte la BD. El usuario ya existe localmente.
        // ─────────────────────────────────────────────────────────────────────
        await this.assignRoleInAuth0(sub, input.role);

        return {
            registered: true,
            createdTenant: dbResult.createdTenant,
            createdUser: dbResult.createdUser,
            createdProfessional: dbResult.createdProfessional,
            createdMembership: dbResult.createdMembership,
            tenantId: dbResult.tenantId,
            userId: dbResult.userId,
            role: dbResult.userRole,
            professionalId: dbResult.professionalId,
        };
    }
    /**
     * Asigna un rol en Auth0 vía M2M.
     * ⚠️ Este método debe llamarse SIEMPRE fuera de cualquier transacción TypeORM.
     * Si Auth0 falla, simplemente se loguea el error y el usuario sigue existiendo en la BD local.
     */
    private async assignRoleInAuth0(userId: string, roleInput: 'professional' | 'adminOrg'): Promise<void> {
        const roleId = roleInput === 'professional'
            ? this.configService.get<string>('AUTH0_ROLE_PROFESSIONAL')
            : this.configService.get<string>('AUTH0_ROLE_ADMINORG');

        if (!roleId) {
            this.logger.warn(
                `[Auth0] Rol '${roleInput}' no configurado en .env (AUTH0_ROLE_PROFESSIONAL / AUTH0_ROLE_ADMINORG). ` +
                `El usuario ${userId} existe en la BD pero NO tiene rol asignado en Auth0.`,
            );
            return;
        }

        try {
            // SDK Auth0 v5: users.roles es un RolesClient con método .assign(id, { roles })
            // Firma: assign(id: string, request: { roles: string[] }) => Promise<void>
            await this.auth0Management.users.roles.assign(userId, { roles: [roleId] });
            this.logger.log(`[Auth0] Rol '${roleInput}' (${roleId}) asignado correctamente al usuario ${userId}.`);
        } catch (error: unknown) {
            // ⚠️ AISLAMIENTO CRÍTICO: El error de Auth0 NO debe propagar.
            // La transacción de BD ya commiteó; el usuario existe localmente.
            // Un job de reconciliación o un reintento manual puede completar esto después.
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(
                `[Auth0] Fallo al asignar rol '${roleInput}' al usuario ${userId}. ` +
                `El registro en BD fue exitoso. Error Auth0: ${message}`,
                error instanceof Error ? error.stack : undefined,
            );
        }
    }

    async getRegistrationStatus(
        authUser: Record<string, unknown> | undefined,
    ): Promise<RegistrationStatusResult> {
        const sub = this.getStringClaim(authUser, 'sub');
        if (!sub) {
            throw new BadRequestException('Missing subject claim in authenticated token');
        }

        const existing = await this.usersService.findByAuth0Id(sub);
        const roles = extractNormalizedRoles(authUser);

        if (!existing) {
            return {
                registered: false,
                needsRegistration: true,
                reason: 'missing_internal_profile',
                hasProfessionalProfile: false,
                hasOrganizationMembership: false,
            };
        }

        const professionalProfile = await this.professionalRepo.findOne({ where: { userId: existing.id } });
        const hasProfessionalProfile = Boolean(professionalProfile);
        const hasOrganizationMembership = Boolean(
            await this.membershipRepo.findOne({ where: { userId: existing.id, isActive: true } }),
        );

        const professionalRole = [UserRole.Professional, UserRole.Professional].includes(existing.role);
        const organizationRole = [UserRole.OrgAdmin, UserRole.OrgAdmin, UserRole.OrgStaff].includes(existing.role);
        const needsRegistration =
            (professionalRole && !hasProfessionalProfile) ||
            (organizationRole && !hasOrganizationMembership);

        return {
            registered: !needsRegistration,
            needsRegistration,
            reason: needsRegistration ? 'incomplete_internal_profile' : 'registered',
            userId: existing.id,
            tenantId: existing.tenantId,
            role: existing.role,
            hasProfessionalProfile,
            hasOrganizationMembership,
            professionalId: professionalProfile?.id,
        };
    }

    async syncAuthenticatedUser(
        authUser: Record<string, unknown> | undefined,
        input: SyncUserInput = {},
    ): Promise<SyncUserResult> {
        const sub = this.getStringClaim(authUser, 'sub');
        if (!sub) {
            throw new BadRequestException('Missing subject claim in authenticated token');
        }

        const existing = await this.usersService.findByAuth0Id(sub);
        const resolvedTenantId = await this.resolveTenantId(input, existing?.tenantId);

        if (!resolvedTenantId) {
            return {
                synced: false,
                created: false,
                reason: 'tenant_context_required',
            };
        }

        const email = this.getStringClaim(authUser, 'email') ?? this.fallbackEmail(sub);
        const { firstName, lastName } = this.resolveNames(authUser);
        const role = this.resolvePersistedRole(authUser);
        const upsert = await this.usersService.upsertByAuth0Sub({
            auth0Sub: sub,
            tenantId: resolvedTenantId,
            email,
            firstName,
            lastName,
            role,
            isActive: true,
        });

        return {
            synced: true,
            created: upsert.created,
            userId: upsert.user.id,
            tenantId: upsert.user.tenantId,
            role: upsert.user.role,
        };
    }

    private async resolveTenantId(input: SyncUserInput, fallbackTenantId?: string): Promise<string | undefined> {
        if (input.tenantId?.trim()) {
            return input.tenantId.trim();
        }

        const tenantSubdomain = input.tenantSubdomain?.trim().toLowerCase();
        if (tenantSubdomain) {
            const tenant = await this.tenantRepo.findOne({
                where: { subdomain: tenantSubdomain, status: TenantStatus.ACTIVE },
            });
            if (tenant) {
                return tenant.id;
            }
        }

        return fallbackTenantId;
    }

    private resolvePersistedRole(authUser: Record<string, unknown> | undefined): UserRole {
        const roles = extractNormalizedRoles(authUser);

        if (roles.includes('superadmin')) {
            return UserRole.SuperAdmin;
        }

        if (roles.some((role) => ['orgadmin', 'orgstaff'].includes(role))) {
            return UserRole[roles.includes('orgadmin') ? 'OrgAdmin' : 'OrgStaff'];
        }

        if (roles.some((role) => ['professional'].includes(role))) {
            return UserRole.Professional;
        }

        return UserRole.Paciente;
    }

    private resolveNames(authUser: Record<string, unknown> | undefined): { firstName: string | undefined; lastName: string | undefined } {
        const explicitFirstName = this.getStringClaim(authUser, 'given_name');
        const explicitLastName = this.getStringClaim(authUser, 'family_name');

        if (explicitFirstName || explicitLastName) {
            return {
                firstName: explicitFirstName,
                lastName: explicitLastName,
            };
        }

        const name = this.getStringClaim(authUser, 'name');
        if (!name) {
            return { firstName: undefined, lastName: undefined };
        }

        const parts = name.split(' ').map((part) => part.trim()).filter(Boolean);
        if (!parts.length) {
            return { firstName: undefined, lastName: undefined };
        }

        if (parts.length === 1) {
            return { firstName: parts[0], lastName: undefined };
        }

        return {
            firstName: parts[0],
            lastName: parts.slice(1).join(' '),
        };
    }

    private fallbackEmail(sub: string): string {
        const normalizedSub = sub.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(-60);
        return `${normalizedSub}@auth0.local`;
    }

    private resolveRegisterRole(role: RegisterUserInput['role']): UserRole {
        if (role === 'adminOrg') {
            return UserRole.OrgAdmin;
        }
        // 'professional' → UserRole.Professional para que la condición de creación
        // del Professional entity funcione correctamente.
        return UserRole.Professional;
    }

    private normalizeSubdomain(input: string): string {
        const normalized = input.trim().toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/--+/g, '-');

        if (!normalized || normalized.length < 3) {
            throw new BadRequestException('subdomain must have at least 3 alphanumeric characters');
        }

        return normalized;
    }

    private toNullableName(value: string | undefined): string {
        return (value ?? null) as unknown as string;
    }

    private getStringClaim(authUser: Record<string, unknown> | undefined, key: string): string | undefined {
        const value = authUser?.[key];
        if (typeof value !== 'string') {
            return undefined;
        }

        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : undefined;
    }
}


