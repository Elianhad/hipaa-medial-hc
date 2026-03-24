import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { FhirService } from './fhir.service';
import { FhirController } from './fhir.controller';
import { TerminologyService } from './terminology.service';

/**
 * FhirModule
 *
 * Acts as a facade between the NestJS backend and AWS HealthLake (FHIR R4).
 * All clinical resources (Condition, Observation, Encounter, Patient) are
 * persisted in AWS HealthLake as the authoritative FHIR store.
 */
@Module({
  imports: [HttpModule],
  providers: [FhirService, TerminologyService],
  controllers: [FhirController],
  exports: [FhirService, TerminologyService],
})
export class FhirModule { }
