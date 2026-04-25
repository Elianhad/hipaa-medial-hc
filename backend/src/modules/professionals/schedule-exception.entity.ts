import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';
import { Professional } from './professional.entity';
import { ProfessionalLocation } from './professional-location.entity';

@Entity('schedule_exceptions')
@Index(['professionalId', 'startDate', 'endDate'])
export class ScheduleException {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'professional_id', type: 'uuid' })
    professionalId: string;

    @Column({ name: 'location_id', type: 'uuid', nullable: true })
    locationId: string | null;

    @ManyToOne(() => Professional, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'professional_id' })
    professional: Professional;

    @ManyToOne(() => ProfessionalLocation, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'location_id' })
    location: ProfessionalLocation | null;

    @Column({ name: 'start_date', type: 'timestamptz' })
    startDate: Date;

    @Column({ name: 'end_date', type: 'timestamptz' })
    endDate: Date;

    @Column({ type: 'text' })
    reason: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
