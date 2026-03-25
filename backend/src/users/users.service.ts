import {
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from './user.entity';
import { TenantMembership } from '../modules/tenants/tenant-membership.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UserResponseDto, UsersListResponseDto } from './dto/user-response.dto';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
        @InjectRepository(TenantMembership)
        private readonly membershipRepo: Repository<TenantMembership>,
    ) { }

    async findByIdOrThrow(id: string, tenantId?: string): Promise<UserResponseDto> {
        const where = tenantId ? { id, tenantId } : { id };
        const user = await this.userRepo.findOne({ where });

        if (!user) {
            throw new NotFoundException(`User ${id} not found`);
        }

        return this.toResponseDto(user);
    }

    async findByAuth0Id(auth0Sub: string, tenantId?: string): Promise<UserResponseDto | null> {
        const where = tenantId ? { auth0Sub, tenantId } : { auth0Sub };
        const user = await this.userRepo.findOne({ where });
        return user ? this.toResponseDto(user) : null;
    }

    async findManyByIds(userIds: string[], tenantId?: string): Promise<UserResponseDto[]> {
        if (!userIds.length) {
            return [];
        }

        const where = tenantId
            ? { id: In(userIds), tenantId }
            : { id: In(userIds) };

        const users = await this.userRepo.find({ where });
        return users.map((user) => this.toResponseDto(user));
    }

    async assertTenantMembership(userId: string, tenantId: string): Promise<void> {
        const userInTenant = await this.userRepo.findOne({
            where: { id: userId, tenantId, isActive: true },
        });

        if (userInTenant) {
            return;
        }

        const membership = await this.membershipRepo.findOne({
            where: { userId, tenantId, isActive: true },
        });

        if (!membership) {
            throw new ForbiddenException(`User ${userId} does not belong to tenant ${tenantId}`);
        }
    }

    async listByTenant(tenantId: string, query: QueryUsersDto): Promise<UsersListResponseDto> {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const search = query.search?.trim().toLowerCase();
        const sortBy = query.sortBy ?? 'createdAt';
        const sortOrder = query.sortOrder ?? 'DESC';

        const qb = this.userRepo
            .createQueryBuilder('user')
            .where('user.tenantId = :tenantId', { tenantId });

        if (search) {
            qb.andWhere(
                '(LOWER(user.email) LIKE :search OR LOWER(user.firstName) LIKE :search OR LOWER(user.lastName) LIKE :search)',
                { search: `%${search}%` },
            );
        }

        qb.orderBy(`user.${sortBy}`, sortOrder)
            .skip((page - 1) * limit)
            .take(limit);

        const [users, total] = await qb.getManyAndCount();
        const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

        return {
            data: users.map((user) => this.toResponseDto(user)),
            meta: {
                page,
                limit,
                total,
                totalPages,
            },
        };
    }

    async createUser(dto: CreateUserDto): Promise<UserResponseDto> {
        const existing = await this.userRepo.findOne({ where: { auth0Sub: dto.auth0Sub } });
        if (existing) {
            throw new ConflictException(`User with auth0Sub ${dto.auth0Sub} already exists`);
        }

        const created = this.userRepo.create({
            tenantId: dto.tenantId,
            auth0Sub: dto.auth0Sub.trim(),
            role: dto.role,
            email: dto.email.trim().toLowerCase(),
            firstName: dto.firstName?.trim(),
            lastName: dto.lastName?.trim(),
            isActive: dto.isActive ?? true,
        });

        const saved = await this.userRepo.save(created);
        return this.toResponseDto(saved);
    }

    async upsertByAuth0Sub(input: {
        auth0Sub: string;
        tenantId: string;
        email: string;
        firstName?: string;
        lastName?: string;
        role: User['role'];
        isActive?: boolean;
    }): Promise<{ user: UserResponseDto; created: boolean }> {
        const existing = await this.userRepo.findOne({ where: { auth0Sub: input.auth0Sub } });

        if (!existing) {
            const created = this.userRepo.create({
                auth0Sub: input.auth0Sub,
                tenantId: input.tenantId,
                email: input.email.trim().toLowerCase(),
                firstName: input.firstName?.trim(),
                lastName: input.lastName?.trim(),
                role: input.role,
                isActive: input.isActive ?? true,
            });

            const saved = await this.userRepo.save(created);
            return {
                user: this.toResponseDto(saved),
                created: true,
            };
        }

        existing.tenantId = input.tenantId;
        existing.email = input.email.trim().toLowerCase();
        existing.firstName = input.firstName?.trim() ?? null;
        existing.lastName = input.lastName?.trim() ?? null;
        existing.role = input.role;
        existing.isActive = input.isActive ?? true;

        const saved = await this.userRepo.save(existing);
        return {
            user: this.toResponseDto(saved),
            created: false,
        };
    }

    async updateUserRole(id: string, role: User['role'], tenantId?: string): Promise<UserResponseDto> {
        const where = tenantId ? { id, tenantId } : { id };
        const user = await this.userRepo.findOne({ where });

        if (!user) {
            throw new NotFoundException(`User ${id} not found`);
        }

        user.role = role;
        const saved = await this.userRepo.save(user);
        return this.toResponseDto(saved);
    }

    async updateUserStatus(id: string, isActive: boolean, tenantId?: string): Promise<UserResponseDto> {
        const where = tenantId ? { id, tenantId } : { id };
        const user = await this.userRepo.findOne({ where });

        if (!user) {
            throw new NotFoundException(`User ${id} not found`);
        }

        user.isActive = isActive;
        const saved = await this.userRepo.save(user);
        return this.toResponseDto(saved);
    }

    private toResponseDto(user: User): UserResponseDto {
        return {
            id: user.id,
            tenantId: user.tenantId,
            auth0Sub: user.auth0Sub,
            role: user.role,
            email: user.email,
            firstName: user.firstName ?? null,
            lastName: user.lastName ?? null,
            isActive: user.isActive,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
    }
}
