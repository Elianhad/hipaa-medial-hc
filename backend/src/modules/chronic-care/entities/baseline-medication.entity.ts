import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { ProblemBaseline } from './problem-baseline.entity';

@Entity('baseline_medications')
export class BaselineMedication {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'baseline_id', type: 'uuid' })
    baselineId: string;

    @Column({ name: 'tenant_id', type: 'uuid' })
    tenantId: string;

    @Column({ name: 'drug_name', length: 300 })
    drugName: string;

    @Column({ name: 'rxnorm_code', nullable: true, length: 20 })
    rxnormCode: string;

    @Column({ nullable: true, length: 100 })
    dose: string;

    @Column({ nullable: true, length: 100 })
    frequency: string;

    @Column({ nullable: true, length: 100 })
    route: string;

    @Column({ name: 'started_at', type: 'date', nullable: true })
    startedAt: string;

    /** NULL means still active */
    @Column({ name: 'stopped_at', type: 'date', nullable: true })
    stoppedAt: string;

    @Column({ name: 'stop_reason', type: 'text', nullable: true })
    stopReason: string;

    @Column({ name: 'fhir_medication_request_id', nullable: true })
    fhirMedicationRequestId: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @ManyToOne(() => ProblemBaseline, (b) => b.medications, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'baseline_id' })
    baseline: ProblemBaseline;
}
