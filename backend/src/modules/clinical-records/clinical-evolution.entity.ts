import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

export enum RecordType {
  SOAP = 'SOAP',
  NOTE = 'note',
  PROCEDURE = 'procedure',
  LAB_RESULT = 'lab_result',
  IMAGING = 'imaging',
}

export enum BillingStatus {
  PENDING = 'pending',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PAID = 'paid',
}

@Entity('clinical_evolutions')
@Index(['tenantId', 'patientId'])
export class ClinicalEvolution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'patient_id', type: 'uuid' })
  patientId: string;

  @Column({ name: 'professional_id', type: 'uuid' })
  professionalId: string;

  @Column({ name: 'appointment_id', type: 'uuid', nullable: true })
  appointmentId: string;

  @Column({ name: 'problem_id', type: 'uuid', nullable: true })
  problemId: string;

  @Column({ name: 'record_type', type: 'enum', enum: RecordType, default: RecordType.SOAP })
  recordType: RecordType;

  @Column({ name: 'evolution_date', type: 'date' })
  evolutionDate: string;

  @Column({ name: 'evolution_time', type: 'time' })
  evolutionTime: string;

  // SOAP fields
  @Column({ nullable: true, type: 'text' })
  subjective: string;

  @Column({ nullable: true, type: 'text' })
  objective: string;

  @Column({ nullable: true, type: 'text' })
  assessment: string;

  @Column({ nullable: true, type: 'text' })
  plan: string;

  @Column({ name: 'nomenclature_id', type: 'uuid', nullable: true })
  nomenclatureId: string;

  @Column({
    name: 'billing_status',
    type: 'enum',
    enum: BillingStatus,
    default: BillingStatus.PENDING,
  })
  billingStatus: BillingStatus;

  @Column({ name: 'fhir_encounter_id', nullable: true })
  fhirEncounterId: string;

  @Column({ name: 'fhir_observation_id', nullable: true })
  fhirObservationId: string;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;
}
