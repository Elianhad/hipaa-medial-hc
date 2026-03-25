import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { TenantMembership } from '../modules/tenants/tenant-membership.entity';
import { UserRole } from '../common/enums/user-role.enum';

describe('UsersService', () => {
  let service: UsersService;
  let userRepo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let membershipRepo: {
    findOne: jest.Mock;
  };

  const now = new Date('2026-01-01T00:00:00.000Z');

  const baseUser = {
    id: 'user-1',
    tenantId: 'tenant-1',
    auth0Sub: 'auth0|user-1',
    role: UserRole.OrgAdmin,
    email: 'user@example.com',
    firstName: 'Jane',
    lastName: 'Doe',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  } as User;

  beforeEach(async () => {
    userRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    membershipRepo = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(TenantMembership), useValue: membershipRepo },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('findByIdOrThrow should return a mapped dto', async () => {
    userRepo.findOne.mockResolvedValue(baseUser);

    const result = await service.findByIdOrThrow('user-1', 'tenant-1');

    expect(userRepo.findOne).toHaveBeenCalledWith({ where: { id: 'user-1', tenantId: 'tenant-1' } });
    expect(result.id).toBe('user-1');
    expect(result.role).toBe(UserRole.OrgAdmin);
  });

  it('findByIdOrThrow should throw NotFoundException when user does not exist', async () => {
    userRepo.findOne.mockResolvedValue(null);

    await expect(service.findByIdOrThrow('missing-user')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('findByAuth0Id should return null when user does not exist', async () => {
    userRepo.findOne.mockResolvedValue(null);

    const result = await service.findByAuth0Id('auth0|missing', 'tenant-1');

    expect(result).toBeNull();
  });

  it('assertTenantMembership should pass when user belongs directly to tenant', async () => {
    userRepo.findOne.mockResolvedValue(baseUser);

    await expect(service.assertTenantMembership('user-1', 'tenant-1')).resolves.toBeUndefined();
    expect(membershipRepo.findOne).not.toHaveBeenCalled();
  });

  it('assertTenantMembership should throw ForbiddenException when no active membership is found', async () => {
    userRepo.findOne.mockResolvedValue(null);
    membershipRepo.findOne.mockResolvedValue(null);

    await expect(service.assertTenantMembership('user-1', 'tenant-2')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('createUser should throw ConflictException when auth0Sub already exists', async () => {
    userRepo.findOne.mockResolvedValue(baseUser);

    await expect(
      service.createUser({
        tenantId: 'tenant-1',
        auth0Sub: 'auth0|user-1',
        role: UserRole.Professional,
        email: 'new@example.com',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('createUser should persist and map the created user', async () => {
    const created = {
      ...baseUser,
      id: 'user-2',
      auth0Sub: 'auth0|user-2',
      role: UserRole.Professional,
      email: 'new@example.com',
      firstName: 'Ana',
      lastName: 'Lopez',
    } as User;

    userRepo.findOne.mockResolvedValue(null);
    userRepo.create.mockReturnValue(created);
    userRepo.save.mockResolvedValue(created);

    const result = await service.createUser({
      tenantId: 'tenant-1',
      auth0Sub: 'auth0|user-2',
      role: UserRole.Professional,
      email: 'NEW@Example.com',
      firstName: ' Ana ',
      lastName: ' Lopez ',
      isActive: true,
    });

    expect(userRepo.create).toHaveBeenCalled();
    expect(result.email).toBe('new@example.com');
    expect(result.id).toBe('user-2');
  });

  it('updateUserRole should update role and persist', async () => {
    const existing = { ...baseUser } as User;
    const saved = { ...baseUser, role: UserRole.Professional } as User;

    userRepo.findOne.mockResolvedValue(existing);
    userRepo.save.mockResolvedValue(saved);

    const result = await service.updateUserRole('user-1', UserRole.Professional, 'tenant-1');

    expect(result.role).toBe(UserRole.Professional);
    expect(userRepo.save).toHaveBeenCalled();
  });

  it('updateUserStatus should throw NotFoundException when user does not exist', async () => {
    userRepo.findOne.mockResolvedValue(null);

    await expect(service.updateUserStatus('missing-user', false)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('listByTenant should return data and pagination meta', async () => {
    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[baseUser], 1]),
    };

    userRepo.createQueryBuilder.mockReturnValue(qb);

    const result = await service.listByTenant('tenant-1', {
      page: 1,
      limit: 20,
      search: 'Jane',
      sortBy: 'createdAt',
      sortOrder: 'DESC',
    });

    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
    expect(result.meta.page).toBe(1);
    expect(qb.andWhere).toHaveBeenCalled();
  });
});
