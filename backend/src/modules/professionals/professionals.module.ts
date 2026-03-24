import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Professional } from './professional.entity';
import { ProfessionalLocation } from './professional-location.entity';
import { ProfessionalsService } from './professionals.service';
import { ProfessionalsController } from './professionals.controller';
import { ProfessionalLocationsService } from './professional-locations.service';
import { ProfessionalLocationsController } from './professional-locations.controller';
import { MockSisaService } from './mock-sisa.service';
import { UsersModule } from 'src/users/users.module';
@Module({
  imports: [TypeOrmModule.forFeature([Professional, ProfessionalLocation]), UsersModule],
  providers: [ProfessionalsService, ProfessionalLocationsService, MockSisaService],
  controllers: [ProfessionalsController, ProfessionalLocationsController],
  exports: [ProfessionalsService, ProfessionalLocationsService, MockSisaService, TypeOrmModule],
})
export class ProfessionalsModule { }
