import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Patient } from './patient.entity';
import { PatientsService } from './patients.service';
import { PatientsController } from './patients.controller';
import { MockRenaperService } from './mock-renaper.service';

@Module({
  imports: [TypeOrmModule.forFeature([Patient])],
  providers: [PatientsService, MockRenaperService],
  controllers: [PatientsController],
  exports: [PatientsService, MockRenaperService],
})
export class PatientsModule {}
