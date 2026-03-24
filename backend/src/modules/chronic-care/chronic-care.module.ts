import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProblemBaseline } from './entities/problem-baseline.entity';
import { BaselineMedication } from './entities/baseline-medication.entity';
import { BaselineAlert } from './entities/baseline-alert.entity';
import { Prescription } from './entities/prescription.entity';
import { AdherenceRecord } from './entities/adherence-record.entity';
import { ProblemTransitionEvent } from './entities/problem-transition-event.entity';
import { ArVademecumItem } from './entities/ar-vademecum-item.entity';

// Shared from clinical-records (imported without creating a circular dep)
import { Problem } from '../clinical-records/problem.entity';
import { ClinicalEvolution } from '../clinical-records/clinical-evolution.entity';

import { FhirModule } from '../fhir/fhir.module';

import { ChronicCareService } from './chronic-care.service';
import { ChronicCareController } from './chronic-care.controller';
import { OutboxWorkerService } from './outbox-worker.service';
import { PrescriptionValidationController } from './prescription-validation.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            ProblemBaseline,
            BaselineMedication,
            BaselineAlert,
            Prescription,
            AdherenceRecord,
            ProblemTransitionEvent,
            ArVademecumItem,
            Problem,
            ClinicalEvolution,
        ]),
        FhirModule,
    ],
    providers: [ChronicCareService, OutboxWorkerService],
    controllers: [ChronicCareController, PrescriptionValidationController],
    exports: [ChronicCareService],
})
export class ChronicCareModule { }
