import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
    Unique,
} from 'typeorm';
import { Professional } from './professional.entity';
import { Tenant } from '../tenants/tenant.entity';

@Entity('professional_locations')
@Index(['professionalId', 'isActive'])
@Unique(['professionalId', 'name'])
export class ProfessionalLocation {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'professional_id', type: 'uuid' })
    professionalId: string;

    @Column({ name: 'tenant_id', type: 'uuid' })
    tenantId: string;

    @ManyToOne(() => Professional, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'professional_id' })
    professional: Professional;

    @ManyToOne(() => Tenant)
    @JoinColumn({ name: 'tenant_id' })
    tenant: Tenant;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ type: 'varchar', length: 512, nullable: true })
    address: string;

    @Column({ type: 'varchar', length: 20, nullable: true })
    phone: string;

    @Column({
        name: 'weekly_schedule',
        type: 'jsonb',
        default: '[]',
        comment: 'Horarios de atención por día',
    })
    weeklySchedule: any[];

    @Column({
        name: 'appointment_rules',
        type: 'jsonb',
        default: '{}',
        comment: 'duration, urgentBlock, breakMinutes, bookingNoticeHours',
    })
    appointmentRules: Record<string, any>;

    @Column({ name: 'is_main_location', default: false })
    isMainLocation: boolean;

    @Column({ name: 'is_active', default: true })
    isActive: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
