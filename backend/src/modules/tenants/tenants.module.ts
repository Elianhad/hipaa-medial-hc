import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Professional } from '../professionals/professional.entity';
import { Tenant } from './tenant.entity';
import { TenantMembership } from './tenant-membership.entity';
import { TenantsService } from './tenants.service';
import { TenantsController } from './tenants.controller';
import { Appointment } from '../appointments/appointment.entity';
import { UsersModule } from '../../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant, TenantMembership, Professional, Appointment]), UsersModule],
  controllers: [TenantsController],
  providers: [TenantsService],
  exports: [TypeOrmModule, TenantsService],
})
export class TenantsModule { }
