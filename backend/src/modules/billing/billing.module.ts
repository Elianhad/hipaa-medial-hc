import { Module } from '@nestjs/common';

/**
 * BillingModule
 *
 * Handles cross-referencing of clinical services against nomenclators
 * and health insurances for billing and audit purposes.
 *
 * TODO: Implement BillingService with:
 *  - getPrestacionesByProfessional(tenantId, professionalId, dateRange)
 *  - crossReferenceWithNomenclator(evolutions, nomenclatorCode)
 *  - generateInconsistencyReport(tenantId, dateRange)
 */
@Module({})
export class BillingModule {}
