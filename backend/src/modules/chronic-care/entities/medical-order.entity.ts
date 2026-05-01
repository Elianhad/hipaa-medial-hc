import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';

export enum MedicalOrderType {
    LABORATORY = 'laboratory',
    IMAGING = 'imaging',
    MEDICATION = 'medication',
    REFERRAL = 'referral',
    PROCEDURE = 'procedure',
}

export enum MedicalOrderStatus {
    DRAFT = 'draft',
    ACTIVE = 'active',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
}

@Entity('medical_orders')
@Index(['tenantId', 'problemId'])
@Index(['tenantId', 'evolutionId'])
@Index(['tenantId', 'patientId', 'orderStatus', 'type'])
export class MedicalOrder {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'tenant_id', type: 'uuid' })
    tenantId: string;

    @Column({ name: 'patient_id', type: 'uuid' })
    patientId: string;

    @Column({ name: 'problem_id', type: 'uuid' })
    problemId: string;

    @Column({ name: 'evolution_id', type: 'uuid' })
    evolutionId: string;

    /** References users.id (the prescribing professional) */
    @Column({ name: 'ordered_by', type: 'uuid' })
    orderedBy: string;

    @Column({
        type: 'enum',
        enum: MedicalOrderType,
        enumName: 'medical_order_type',
    })
    type: MedicalOrderType;

    @Column({ type: 'text' })
    detail: string;

    @Column({
        name: 'order_status',
        type: 'enum',
        enum: MedicalOrderStatus,
        enumName: 'medical_order_status',
        default: MedicalOrderStatus.ACTIVE,
    })
    orderStatus: MedicalOrderStatus;

    @Column({ name: 'fhir_resource_type', length: 50, nullable: true })
    fhirResourceType: string | null;

    @Column({ name: 'fhir_resource_id', length: 255, nullable: true })
    fhirResourceId: string | null;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date;

    @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
    completedAt: Date | null;

    @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
    cancelledAt: Date | null;
}
