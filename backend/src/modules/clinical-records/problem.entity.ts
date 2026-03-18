import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ProblemStatus {
  ACTIVE = 'active',
  RESOLVED = 'resolved',
  CHRONIC = 'chronic',
  INACTIVE = 'inactive',
}

@Entity('problems')
@Index(['tenantId', 'patientId'])
export class Problem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'patient_id', type: 'uuid' })
  patientId: string;

  @Column({ length: 500 })
  title: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ name: 'icd10_code', nullable: true, length: 20 })
  icd10Code: string;

  @Column({ name: 'onset_date', type: 'date', nullable: true })
  onsetDate: string;

  @Column({ name: 'resolution_date', type: 'date', nullable: true })
  resolutionDate: string;

  @Column({ type: 'enum', enum: ProblemStatus, default: ProblemStatus.ACTIVE })
  status: ProblemStatus;

  @Column({ name: 'fhir_resource_id', nullable: true })
  fhirResourceId: string;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
