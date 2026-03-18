import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { FhirService } from './fhir.service';
import { FhirController } from './fhir.controller';

/**
 * FhirModule
 *
 * Acts as a facade between the NestJS backend and AWS HealthLake (FHIR R4).
 * All clinical resources (Condition, Observation, Encounter, Patient) are
 * persisted in AWS HealthLake as the authoritative FHIR store.
 */
@Module({
  imports: [HttpModule],
  providers: [FhirService],
  controllers: [FhirController],
  exports: [FhirService],
})
export class FhirModule {}
