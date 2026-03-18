import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { UserRole } from '../../common/enums/user-role.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'auth0_sub', unique: true })
  auth0Sub: string;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  @Column()
  email: string;

  @Column({ name: 'first_name', nullable: true, length: 100 })
  firstName: string;

  @Column({ name: 'last_name', nullable: true, length: 100 })
  lastName: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
