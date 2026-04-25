import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Professional } from './professional.entity';
import { ProfessionalLocation } from './professional-location.entity';
import { ProfessionalsService } from './professionals.service';
import { ProfessionalsController } from './professionals.controller';
import { ProfessionalLocationsService } from './professional-locations.service';
import { ProfessionalLocationsController } from './professional-locations.controller';
import { MockSisaService } from './mock-sisa.service';
import { ScheduleException } from './schedule-exception.entity';
import { ScheduleExceptionsService } from './schedule-exceptions.service';
import { ScheduleExceptionsController } from './schedule-exceptions.controller';
import { AvailabilityService } from './availability.service';
import { AvailabilityController } from './availability.controller';
import { Appointment } from '../appointments/appointment.entity';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Professional,
      ProfessionalLocation,
      ScheduleException,
      Appointment,
    ]),
    UsersModule,
  ],
  providers: [
    ProfessionalsService,
    ProfessionalLocationsService,
    ScheduleExceptionsService,
    AvailabilityService,
    MockSisaService,
  ],
  controllers: [
    ProfessionalsController,
    ProfessionalLocationsController,
    ScheduleExceptionsController,
    AvailabilityController,
  ],
  exports: [
    ProfessionalsService,
    ProfessionalLocationsService,
    ScheduleExceptionsService,
    AvailabilityService,
    MockSisaService,
    TypeOrmModule,
  ],
})
export class ProfessionalsModule { }
