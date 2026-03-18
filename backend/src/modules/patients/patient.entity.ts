import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { SexType } from '../../common/enums/sex-type.enum';

export { SexType };

@Entity('patients')
export class Patient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ length: 20 })
  dni: string;

  @Column({ type: 'enum', enum: SexType })
  sex: SexType;

  @Column({ name: 'first_name', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', length: 100 })
  lastName: string;

  @Column({ name: 'birth_date', type: 'date' })
  birthDate: string;

  @Column({ name: 'photo_url', nullable: true })
  photoUrl: string;

  @Column({ name: 'identity_verified', default: false })
  identityVerified: boolean;

  @Column({ nullable: true, unique: true })
  email: string;

  @Column({ nullable: true, length: 30 })
  phone: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true, length: 100 })
  city: string;

  @Column({ nullable: true, length: 100 })
  province: string;

  @Column({ default: 'AR', length: 100 })
  country: string;

  @Column({ name: 'postal_code', nullable: true, length: 20 })
  postalCode: string;

  @Column({ name: 'primary_insurance_id', nullable: true, type: 'uuid' })
  primaryInsuranceId: string;

  @Column({ name: 'secondary_insurance_id', nullable: true, type: 'uuid' })
  secondaryInsuranceId: string;

  @Column({
    name: 'insurance_member_number',
    nullable: true,
    length: 100,
  })
  insuranceMemberNumber: string;

  @Index({ unique: true })
  @Column({ name: 'auth0_sub', nullable: true, length: 255 })
  auth0Sub: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;
}
