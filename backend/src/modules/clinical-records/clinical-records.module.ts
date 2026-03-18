import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClinicalEvolution } from './clinical-evolution.entity';
import { Problem } from './problem.entity';
import { ClinicalRecordsService } from './clinical-records.service';
import { ClinicalRecordsController } from './clinical-records.controller';
import { FhirModule } from '../fhir/fhir.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ClinicalEvolution, Problem]),
    FhirModule,
  ],
  providers: [ClinicalRecordsService],
  controllers: [ClinicalRecordsController],
  exports: [ClinicalRecordsService],
})
export class ClinicalRecordsModule {}
