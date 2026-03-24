import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
    Index,
} from 'typeorm';
import { BaselineMedication } from './baseline-medication.entity';
import { BaselineAlert } from './baseline-alert.entity';

export interface StructuredGoal {
    loincCode: string;
    display: string;
    /** '<' | '<=' | '>' | '>=' | '==' */
    operator: string;
    targetValue: number;
    unit: string;
}

@Entity('problem_baselines')
@Index(['tenantId', 'patientId'])
export class ProblemBaseline {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'tenant_id', type: 'uuid' })
    tenantId: string;

    @Column({ name: 'problem_id', type: 'uuid' })
    problemId: string;

    @Column({ name: 'patient_id', type: 'uuid' })
    patientId: string;

    /** Free-text clinical goal strings, e.g. ["TA sistólica < 140 mmHg", "HbA1c < 7%"] */
    @Column({ name: 'clinical_goals', type: 'simple-array', nullable: true })
    clinicalGoals: string[];

    /** Structured goals with LOINC + operator + threshold */
    @Column({ name: 'goals_structured', type: 'jsonb', default: [] })
    goalsStructured: StructuredGoal[];

    /** LOINC codes to auto-fetch on routine control (e.g. ["8480-6","8462-4"] for HTA) */
    @Column({ name: 'auto_fetch_loincodes', type: 'simple-array', nullable: true })
    autoFetchLoincCodes: string[];

    @Column({ name: 'sustaining_treatment_note', type: 'text', nullable: true })
    sustainingTreatmentNote: string;

    @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
    reviewedBy: string;

    @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
    reviewedAt: Date;

    @Column({ name: 'created_by', type: 'uuid' })
    createdBy: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @OneToMany(() => BaselineMedication, (m) => m.baseline, { cascade: true, eager: true })
    medications: BaselineMedication[];

    @OneToMany(() => BaselineAlert, (a) => a.baseline, { cascade: true, eager: true })
    alerts: BaselineAlert[];
}
