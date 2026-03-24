import { Repository } from 'typeorm';
import { AuthUserProvisioningService } from './auth-user-provisioning.service';
import { UserRole } from '../../common/enums/user-role.enum';
import { TenantStatus } from '../tenants/tenant.entity';
import { MemberRole } from '../tenants/tenant-membership.entity';
import { ConfigService } from '@nestjs/config';

type MockRepo = {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
};

type TxManager = {
    getRepository: jest.Mock;
};

function createRepoMock(): MockRepo {
    return {
        findOne: jest.fn(),
        create: jest.fn((value) => value),
        save: jest.fn(async (value) => value),
    };
}

describe('AuthUserProvisioningService', () => {
    let userRepo: MockRepo;
    let professionalRepo: MockRepo;
    let membershipRepo: MockRepo;
    let tenantRepo: MockRepo;
    let txUserRepo: MockRepo;
    let txProfessionalRepo: MockRepo;
    let txMembershipRepo: MockRepo;
    let txTenantRepo: MockRepo;
    let txManager: TxManager;
    let dataSource: { transaction: jest.Mock };
    let service: AuthUserProvisioningService;

    beforeEach(() => {
        userRepo = createRepoMock();
        professionalRepo = createRepoMock();
        membershipRepo = createRepoMock();
        tenantRepo = createRepoMock();

        txUserRepo = createRepoMock();
        txProfessionalRepo = createRepoMock();
        txMembershipRepo = createRepoMock();
        txTenantRepo = createRepoMock();

        txManager = {
            getRepository: jest.fn((entity) => {
                if (entity?.name === 'User') return txUserRepo;
                if (entity?.name === 'Professional') return txProfessionalRepo;
                if (entity?.name === 'TenantMembership') return txMembershipRepo;
                if (entity?.name === 'Tenant') return txTenantRepo;
                return null;
            }),
        };

        dataSource = {
            transaction: jest.fn(async (callback) => callback(txManager)),
        };

        service = new AuthUserProvisioningService(
            dataSource as any,
            userRepo as unknown as Repository<any>,
            professionalRepo as unknown as Repository<any>,
            membershipRepo as unknown as Repository<any>,
            tenantRepo as unknown as Repository<any>,
            ConfigService as unknown as any
        );
    });

    it('returns pending tenant state when first login has no tenant context', async () => {
        (userRepo.findOne as jest.Mock).mockResolvedValue(null);

        const result = await service.syncAuthenticatedUser({
            sub: 'auth0|first-user',
            email: 'first@example.com',
            roles: ['professional'],
        });

        expect(result).toEqual({
            synced: false,
            created: false,
            reason: 'tenant_context_required',
        });
        expect(userRepo.save).not.toHaveBeenCalled();
    });

    it('creates local user when tenant context exists', async () => {
        (userRepo.findOne as jest.Mock).mockResolvedValue(null);
        (userRepo.save as jest.Mock).mockImplementation(async (value) => ({ ...value, id: 'user-1' }));

        const result = await service.syncAuthenticatedUser(
            {
                sub: 'auth0|new-user',
                email: 'new@example.com',
                given_name: 'Ada',
                family_name: 'Lovelace',
                roles: ['professional'],
            },
            { tenantId: 'tenant-1' },
        );

        expect(userRepo.create).toHaveBeenCalledWith(
            expect.objectContaining({
                auth0Sub: 'auth0|new-user',
                tenantId: 'tenant-1',
                role: UserRole.TenantProf,
            }),
        );
        expect(result).toEqual({
            synced: true,
            created: true,
            userId: 'user-1',
            tenantId: 'tenant-1',
            role: UserRole.TenantProf,
        });
    });

    it('updates existing user data and role on subsequent login', async () => {
        (userRepo.findOne as jest.Mock).mockResolvedValue({
            id: 'user-1',
            auth0Sub: 'auth0|existing',
            tenantId: 'tenant-old',
            email: 'old@example.com',
            role: UserRole.Paciente,
            firstName: 'Old',
            lastName: 'Name',
            isActive: false,
        });

        const result = await service.syncAuthenticatedUser(
            {
                sub: 'auth0|existing',
                email: 'updated@example.com',
                name: 'Grace Hopper',
                roles: ['orgadmin'],
            },
            { tenantId: 'tenant-new' },
        );

        expect(userRepo.save).toHaveBeenCalledWith(
            expect.objectContaining({
                tenantId: 'tenant-new',
                email: 'updated@example.com',
                role: UserRole.TenantOrg,
                isActive: true,
            }),
        );

        expect(result).toEqual({
            synced: true,
            created: false,
            userId: 'user-1',
            tenantId: 'tenant-new',
            role: UserRole.TenantOrg,
        });
    });

    it('resolves tenant by subdomain when tenantId is missing', async () => {
        (userRepo.findOne as jest.Mock).mockResolvedValue(null);
        (tenantRepo.findOne as jest.Mock).mockResolvedValue({
            id: 'tenant-from-subdomain',
            subdomain: 'clinica-demo',
            status: TenantStatus.ACTIVE,
        });
        (userRepo.save as jest.Mock).mockImplementation(async (value) => ({ ...value, id: 'user-subdomain' }));

        const result = await service.syncAuthenticatedUser(
            {
                sub: 'auth0|tenant-subdomain',
                roles: ['paciente'],
            },
            { tenantSubdomain: 'clinica-demo' },
        );

        expect(tenantRepo.findOne).toHaveBeenCalledWith({
            where: { subdomain: 'clinica-demo', status: TenantStatus.ACTIVE },
        });
        expect(result.tenantId).toBe('tenant-from-subdomain');
        expect(result.synced).toBe(true);
    });

    it('registers professional with tenant + user + professional profile', async () => {
        (txTenantRepo.findOne as jest.Mock).mockResolvedValue(null);
        (txTenantRepo.save as jest.Mock).mockImplementation(async (value) => ({ ...value, id: 'tenant-1' }));
        (txUserRepo.findOne as jest.Mock).mockResolvedValue(null);
        (txUserRepo.save as jest.Mock).mockImplementation(async (value) => ({ ...value, id: 'user-1' }));
        (txProfessionalRepo.findOne as jest.Mock).mockResolvedValue(null);
        (txProfessionalRepo.save as jest.Mock).mockImplementation(async (value) => ({ ...value, id: 'prof-1' }));

        const result = await service.registerAuthenticatedUser(
            { sub: 'auth0|new-prof', email: 'prof@example.com' },
            {
                role: 'professional',
                tenantName: 'Consultorio Test',
                subdomain: 'consultorio-test',
                firstName: 'Ana',
                lastName: 'Medica',
                licenseNumber: 'MN-12345',
                specialty: 'Clinica medica',
            },
        );

        expect(result).toEqual(
            expect.objectContaining({
                registered: true,
                createdTenant: true,
                createdUser: true,
                createdProfessional: true,
                createdMembership: false,
                tenantId: 'tenant-1',
                userId: 'user-1',
                professionalId: 'prof-1',
                role: UserRole.TenantProf,
            }),
        );
    });

    it('registers org admin with tenant + admin membership', async () => {
        (txTenantRepo.findOne as jest.Mock).mockResolvedValue(null);
        (txTenantRepo.save as jest.Mock).mockImplementation(async (value) => ({ ...value, id: 'tenant-org' }));
        (txUserRepo.findOne as jest.Mock).mockResolvedValue(null);
        (txUserRepo.save as jest.Mock).mockImplementation(async (value) => ({ ...value, id: 'user-org' }));
        (txMembershipRepo.findOne as jest.Mock).mockResolvedValue(null);
        (txMembershipRepo.save as jest.Mock).mockImplementation(async (value) => ({ ...value, id: 'membership-1' }));

        const result = await service.registerAuthenticatedUser(
            { sub: 'auth0|org-admin', email: 'admin@org.com' },
            {
                role: 'adminOrg',
                tenantName: 'Clinica Org',
                subdomain: 'clinica-org',
            },
        );

        expect(txMembershipRepo.create).toHaveBeenCalledWith(
            expect.objectContaining({ role: MemberRole.ADMIN }),
        );

        expect(result).toEqual(
            expect.objectContaining({
                registered: true,
                createdMembership: true,
                tenantId: 'tenant-org',
                userId: 'user-org',
                role: UserRole.TenantOrg,
            }),
        );
    });
    it('returns professionalId in registration status when professional profile exists', async () => {
        (userRepo.findOne as jest.Mock).mockResolvedValue({
            id: 'user-1',
            auth0Sub: 'auth0|existing',
            tenantId: 'tenant-1',
            role: UserRole.TenantProf,
        });
        (professionalRepo.findOne as jest.Mock).mockResolvedValue({ id: 'prof-1', userId: 'user-1' });
        (membershipRepo.findOne as jest.Mock).mockResolvedValue(null);

        const result = await service.getRegistrationStatus({ sub: 'auth0|existing' });

        expect(result.needsRegistration).toBe(false);
        expect(result.hasProfessionalProfile).toBe(true);
        expect(result.professionalId).toBe('prof-1');
    });
});

