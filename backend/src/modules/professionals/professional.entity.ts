import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('professionals')
export class Professional {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'license_number', length: 100 })
  licenseNumber: string;

  @Column({ nullable: true, length: 200 })
  specialty: string;

  @Column({ nullable: true, type: 'text' })
  bio: string;

  @Column({ name: 'photo_url', nullable: true })
  photoUrl: string;

  @Column({ name: 'signature_url', nullable: true })
  signatureUrl: string;

  @Column({ name: 'logo_url', nullable: true })
  logoUrl: string;

  @Column({ name: 'schedule_config', type: 'jsonb', default: '{}' })
  scheduleConfig: Record<string, any>;

  @Column({ name: 'consultation_fee', type: 'numeric', precision: 10, scale: 2, nullable: true })
  consultationFee: number;

  @Column({ name: 'is_public', default: true })
  isPublic: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
