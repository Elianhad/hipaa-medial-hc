import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    Index,
} from 'typeorm';

export type AdherenceSource =
    | 'pharmacy_dispense'
    | 'patient_report'
    | 'caregiver_report'
    | 'ehr_sync';

@Entity('adherence_records')
@Index(['prescriptionId'])
export class AdherenceRecord {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'tenant_id', type: 'uuid' })
    tenantId: string;

    @Column({ name: 'prescription_id', type: 'uuid' })
    prescriptionId: string;

    @Column({ name: 'patient_id', type: 'uuid' })
    patientId: string;

    @Column({ name: 'report_date', type: 'date' })
    reportDate: string;

    @Column({ name: 'doses_prescribed', type: 'smallint' })
    dosesPrescribed: number;

    @Column({ name: 'doses_taken', type: 'smallint' })
    dosesTaken: number;

    /** Computed by DB: (doses_taken / doses_prescribed) * 100 */
    @Column({
        name: 'adherence_pct',
        type: 'numeric',
        precision: 5,
        scale: 2,
        insert: false,
        update: false,
        nullable: true,
    })
    adherencePct: number;

    @Column({ type: 'enum', enum: ['pharmacy_dispense', 'patient_report', 'caregiver_report', 'ehr_sync'] })
    source: AdherenceSource;

    @Column({ type: 'text', nullable: true })
    notes: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
