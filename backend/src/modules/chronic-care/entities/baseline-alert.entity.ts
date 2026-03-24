import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { ProblemBaseline } from './problem-baseline.entity';

export type AlertType =
    | 'laboratory'
    | 'imaging'
    | 'referral'
    | 'vaccination'
    | 'vital_check';

export type AlertIntervalUnit = 'days' | 'weeks' | 'months' | 'years';

@Entity('baseline_alerts')
export class BaselineAlert {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'baseline_id', type: 'uuid' })
    baselineId: string;

    @Column({ name: 'tenant_id', type: 'uuid' })
    tenantId: string;

    @Column({ name: 'alert_type', length: 50 })
    alertType: AlertType;

    @Column({ length: 500 })
    description: string;

    @Column({ name: 'loinc_code', nullable: true, length: 20 })
    loincCode: string;

    @Column({ name: 'interval_value', type: 'smallint' })
    intervalValue: number;

    @Column({ name: 'interval_unit', type: 'enum', enum: ['days', 'weeks', 'months', 'years'] })
    intervalUnit: AlertIntervalUnit;

    @Column({ name: 'last_completed_at', type: 'date', nullable: true })
    lastCompletedAt: string;

    /** Computed by DB: last_completed_at + interval */
    @Column({ name: 'next_due_at', type: 'date', nullable: true, insert: false, update: false })
    nextDueAt: string;

    /** Computed by DB */
    @Column({ name: 'is_overdue', type: 'boolean', nullable: true, insert: false, update: false })
    isOverdue: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @ManyToOne(() => ProblemBaseline, (b) => b.alerts, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'baseline_id' })
    baseline: ProblemBaseline;
}
