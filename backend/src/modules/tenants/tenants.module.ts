import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Professional } from '../professionals/professional.entity';
import { User } from '../professionals/user.entity';
import { Tenant } from './tenant.entity';
import { TenantMembership } from './tenant-membership.entity';
import { TenantsService } from './tenants.service';
import { TenantsController } from './tenants.controller';
import { Appointment } from '../appointments/appointment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant, TenantMembership, Professional, User, Appointment])],
  controllers: [TenantsController],
  providers: [TenantsService],
  exports: [TypeOrmModule, TenantsService],
})
export class TenantsModule { }
