import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * @deprecated Use ProblemClinicalStatus + ProblemCategory para lógica nueva.
 * Se mantiene nullable para compatibilidad con registros legacy.
 */
export enum ProblemStatus {
  ACTIVE = 'active',
  RESOLVED = 'resolved',
  CHRONIC = 'chronic',
  INACTIVE = 'inactive',
}

export enum DecompensationStatus {
  NONE = 'none',
  ACUTE_EXACERBATION = 'acute_exacerbation',
  HOSPITALIZED = 'hospitalized',
  RESOLVED_DECOMPENSATION = 'resolved_decompensation',
}

/**
 * Clasificación funcional del problema, alineada con FHIR R4 Condition.category.
 *
 * - ENCOUNTER_DIAGNOSIS  → Diagnóstico del encuentro (motivo de la consulta actual)
 * - PROBLEM_LIST_ITEM    → Problema longitudinal / crónico en lista activa
 * - HEALTH_CONCERN       → Preocupación de salud / riesgo o factor predisponente
 */
export enum ProblemCategory {
  ENCOUNTER_DIAGNOSIS = 'encounter_diagnosis',
  PROBLEM_LIST_ITEM = 'problem_list_item',
  HEALTH_CONCERN = 'health_concern',
}

/**
 * Estado clínico actual del problema, mapeado directamente a
 * http://terminology.hl7.org/CodeSystem/condition-clinical.
 *
 * - ACTIVE      → Activo
 * - RECURRENCE  → Recidiva (reapertura de problema previamente resuelto)
 * - INACTIVE    → Inactivo / controlado
 * - REMISSION   → Remisión (bajo tratamiento, sin síntomas activos)
 * - RESOLVED    → Resuelto / cerrado
 */
export enum ProblemClinicalStatus {
  ACTIVE = 'active',
  RECURRENCE = 'recurrence',
  INACTIVE = 'inactive',
  REMISSION = 'remission',
  RESOLVED = 'resolved',
}

/**
 * Estado de verificación diagnóstica, alineado con FHIR R4 Condition.verificationStatus
 * (http://terminology.hl7.org/CodeSystem/condition-ver-status).
 *
 * - PROVISIONAL   → Presuntivo
 * - DIFFERENTIAL  → Diagnóstico diferencial
 * - CONFIRMED     → Confirmado
 * - REFUTED       → Descartado
 */
export enum ProblemVerificationStatus {
  PROVISIONAL = 'provisional',
  DIFFERENTIAL = 'differential',
  CONFIRMED = 'confirmed',
  REFUTED = 'refuted',
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

  /**
   * @deprecated Campo legacy para compatibilidad con registros anteriores.
   * Usar clinicalStatus para lógica nueva.
   */
  @Column({ type: 'enum', enum: ProblemStatus, nullable: true, default: ProblemStatus.ACTIVE })
  status: ProblemStatus;

  @Column({ name: 'fhir_resource_id', nullable: true })
  fhirResourceId: string;

  @Column({ name: 'fhir_condition_id', nullable: true })
  fhirConditionId: string;

  @Column({ name: 'snomed_code', nullable: true, length: 30 })
  snomedCode: string;

  @Column({ name: 'icd11_code', nullable: true, length: 20 })
  icd11Code: string;

  @Column({ name: 'category', type: 'enum', enum: ProblemCategory, default: ProblemCategory.ENCOUNTER_DIAGNOSIS })
  category: ProblemCategory;

  @Column({ name: 'clinical_status', type: 'enum', enum: ProblemClinicalStatus, default: ProblemClinicalStatus.ACTIVE })
  clinicalStatus: ProblemClinicalStatus;

  @Column({
    name: 'verification_status',
    type: 'varchar',
    length: 20,
    nullable: true,
    default: ProblemVerificationStatus.PROVISIONAL,
  })
  verificationStatus: ProblemVerificationStatus;

  @Column({ name: 'closure_summary', nullable: true, type: 'text' })
  closureSummary: string;

  @Column({ name: 'resolution_reason', nullable: true, length: 50 })
  resolutionReason: string;

  @Column({ name: 'resolved_by', nullable: true, type: 'uuid' })
  resolvedBy: string;

  @Column({ name: 'recurrence_of_problem_id', nullable: true, type: 'uuid' })
  recurrenceOfProblemId: string;

  @Column({
    name: 'decompensation_status',
    type: 'enum',
    enum: DecompensationStatus,
    default: DecompensationStatus.NONE,
  })
  decompensationStatus: DecompensationStatus;

  @Column({ name: 'decompensation_started_at', type: 'timestamptz', nullable: true })
  decompensationStartedAt: Date;

  @Column({ name: 'decompensation_resolved_at', type: 'timestamptz', nullable: true })
  decompensationResolvedAt: Date;

  @Column({ name: 'thread_signed_at', type: 'timestamptz', nullable: true })
  threadSignedAt: Date;

  @Column({ name: 'thread_signed_by', type: 'uuid', nullable: true })
  threadSignedBy: string;

  @Column({ name: 'thread_signature_hash', length: 128, nullable: true })
  threadSignatureHash: string;

  @Column({ name: 'thread_signature_provider', length: 30, nullable: true, default: 'local_hash' })
  threadSignatureProvider: string;

  @Column({ name: 'thread_pfdr_transaction_id', length: 120, nullable: true })
  threadPfdrTransactionId: string;

  @Column({ name: 'is_thread_locked', default: false })
  isThreadLocked: boolean;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
