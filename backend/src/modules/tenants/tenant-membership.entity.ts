import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';

/** Role of a user within an organization tenant. */
export enum MemberRole {
    ADMIN = 'admin',
    STAFF = 'staff',
}

/**
 * Represents the membership of a user (professional) inside an
 * organization tenant.  Independent professionals own their tenant
 * directly and do not need a TenantMembership record.
 */
@Entity('tenant_memberships')
@Index(['tenantId', 'userId'], { unique: true })
export class TenantMembership {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'tenant_id', type: 'uuid' })
    tenantId: string;

    @Column({ name: 'user_id', type: 'uuid' })
    userId: string;

    @Column({ type: 'enum', enum: MemberRole, default: MemberRole.STAFF })
    role: MemberRole;

    @Column({ name: 'is_active', default: true })
    isActive: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
