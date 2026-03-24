import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';

export enum PrescriptionStatus {
    DRAFT = 'draft',
    ACTIVE = 'active',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
    ON_HOLD = 'on_hold',
    STOPPED = 'stopped',
}

@Entity('prescriptions')
@Index(['tenantId', 'patientId'])
@Index(['problemId'])
export class Prescription {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'tenant_id', type: 'uuid' })
    tenantId: string;

    @Column({ name: 'patient_id', type: 'uuid' })
    patientId: string;

    @Column({ name: 'professional_id', type: 'uuid' })
    professionalId: string;

    @Column({ name: 'problem_id', type: 'uuid' })
    problemId: string;

    @Column({ name: 'evolution_id', type: 'uuid', nullable: true })
    evolutionId: string;

    @Column({ name: 'baseline_id', type: 'uuid', nullable: true })
    baselineId: string;

    @Column({ name: 'drug_name', length: 300 })
    drugName: string;

    @Column({ name: 'rxnorm_code', nullable: true, length: 20 })
    rxnormCode: string;

    @Column({ name: 'snomed_drug_code', nullable: true, length: 30 })
    snomedDrugCode: string;

    /** DCI / generic ingredient (Ley 25.649) */
    @Column({ name: 'dci_name', length: 200 })
    dciName: string;

    /** Commercial brand is optional by law */
    @Column({ name: 'brand_name', nullable: true, length: 200 })
    brandName: string;

    /** SNOMED CT AR medication concept */
    @Column({ name: 'snomed_ct_ar_code', nullable: true, length: 30 })
    snomedCtArCode: string;

    @Column({ name: 'doctor_license', nullable: true, length: 50 })
    doctorLicense: string;

    @Column({ name: 'validation_token', type: 'uuid', nullable: true })
    validationToken: string;

    @Column({ name: 'qr_validation_url', type: 'text', nullable: true })
    qrValidationUrl: string;

    /** Encrypted JSON document payload for HIPAA/Habeas data compliance */
    @Column({ name: 'digital_document_encrypted', type: 'text', nullable: true })
    digitalDocumentEncrypted: string;

    @Column({ name: 'digital_document_hash', length: 128, nullable: true })
    digitalDocumentHash: string;

    @Column({ length: 100 })
    dose: string;

    @Column({ length: 100 })
    frequency: string;

    @Column({ length: 50, default: 'oral' })
    route: string;

    @Column({ name: 'duration_days', type: 'smallint', nullable: true })
    durationDays: number;

    @Column({ type: 'smallint', nullable: true })
    quantity: number;

    @Column({ type: 'smallint', default: 0 })
    refills: number;

    @Column({ type: 'text', nullable: true })
    instructions: string;

    @Column({ name: 'dispense_as_written', default: false })
    dispenseAsWritten: boolean;

    @Column({
        type: 'enum',
        enum: PrescriptionStatus,
        default: PrescriptionStatus.ACTIVE,
    })
    status: PrescriptionStatus;

    @Column({ name: 'authored_on', type: 'date' })
    authoredOn: string;

    @Column({ name: 'valid_until', type: 'date', nullable: true })
    validUntil: string;

    @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
    cancelledAt: Date;

    @Column({ name: 'cancel_reason', type: 'text', nullable: true })
    cancelReason: string;

    @Column({ name: 'signed_at', type: 'timestamptz', nullable: true })
    signedAt: Date;

    @Column({ name: 'signature_hash', length: 128, nullable: true })
    signatureHash: string;

    @Column({ name: 'signed_by', type: 'uuid', nullable: true })
    signedBy: string;

    @Column({ name: 'signature_provider', length: 30, nullable: true, default: 'local_hash' })
    signatureProvider: string;

    @Column({ name: 'pfdr_transaction_id', length: 120, nullable: true })
    pfdrTransactionId: string;

    @Column({ name: 'is_locked', default: false })
    isLocked: boolean;

    @Column({ name: 'fhir_medication_request_id', nullable: true })
    fhirMedicationRequestId: string;

    @Column({ name: 'refilled_from_id', type: 'uuid', nullable: true })
    refilledFromId: string;

    @Column({ name: 'is_one_click_refill', default: false })
    isOneClickRefill: boolean;

    @Column({ name: 'refill_days_supply', type: 'smallint', nullable: true })
    refillDaysSupply: number;

    @Column({ name: 'prolonged_plan_group_id', type: 'uuid', nullable: true })
    prolongedPlanGroupId: string;

    @Column({ name: 'installment_number', type: 'smallint', nullable: true })
    installmentNumber: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
