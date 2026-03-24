import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    Index,
} from 'typeorm';

export type ProblemTransitionType =
    | 'promoted_to_chronic'
    | 'reclassified'
    | 'discarded'
    | 'resolved'
    | 'reopened'
    | 'renamed';

@Entity('problem_transition_events')
@Index(['tenantId', 'problemId', 'createdAt'])
export class ProblemTransitionEvent {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'tenant_id', type: 'uuid' })
    tenantId: string;

    @Column({ name: 'problem_id', type: 'uuid' })
    problemId: string;

    @Column({ name: 'patient_id', type: 'uuid' })
    patientId: string;

    @Column({ name: 'transition_type', length: 40 })
    transitionType: ProblemTransitionType;

    @Column({ name: 'from_title', length: 500, nullable: true })
    fromTitle: string;

    @Column({ name: 'to_title', length: 500, nullable: true })
    toTitle: string;

    @Column({ name: 'from_category', length: 30, nullable: true })
    fromCategory: string;

    @Column({ name: 'to_category', length: 30, nullable: true })
    toCategory: string;

    @Column({ name: 'from_clinical_status', length: 30, nullable: true })
    fromClinicalStatus: string;

    @Column({ name: 'to_clinical_status', length: 30, nullable: true })
    toClinicalStatus: string;

    @Column({ name: 'reason_note', type: 'text', nullable: true })
    reasonNote: string;

    @Column({ type: 'jsonb', default: {} })
    metadata: Record<string, unknown>;

    @Column({ name: 'performed_by', type: 'uuid' })
    performedBy: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
