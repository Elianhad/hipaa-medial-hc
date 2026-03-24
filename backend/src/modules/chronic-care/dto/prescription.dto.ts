import {
    IsUUID,
    IsString,
    IsOptional,
    IsBoolean,
    IsNumber,
    IsIn,
    Min,
    Max,
    IsDateString,
} from 'class-validator';

export class CreatePrescriptionDto {
    @IsUUID()
    patientId: string;

    @IsUUID()
    professionalId: string;

    @IsUUID()
    problemId: string;

    @IsUUID()
    @IsOptional()
    evolutionId?: string;

    @IsUUID()
    @IsOptional()
    baselineId?: string;

    @IsString()
    drugName: string;

    /** DCI mandatory (Ley 25.649) */
    @IsString()
    dciName: string;

    /** Brand is optional by regulation */
    @IsString()
    @IsOptional()
    brandName?: string;

    /** SNOMED CT AR mapping */
    @IsString()
    @IsOptional()
    snomedCtArCode?: string;

    @IsString()
    doctorLicense: string;

    @IsString()
    @IsOptional()
    rxnormCode?: string;

    @IsString()
    dose: string;

    @IsString()
    frequency: string;

    @IsString()
    @IsOptional()
    route?: string;

    @IsNumber()
    @IsOptional()
    durationDays?: number;

    @IsNumber()
    @IsOptional()
    quantity?: number;

    @IsNumber()
    @Min(0)
    @Max(12)
    @IsOptional()
    refills?: number;

    @IsString()
    @IsOptional()
    instructions?: string;

    @IsBoolean()
    @IsOptional()
    dispenseAsWritten?: boolean;

    @IsDateString()
    @IsOptional()
    authoredOn?: string;
}

export class OneClickRefillDto {
    @IsUUID()
    patientId: string;

    @IsUUID()
    professionalId: string;

    @IsString()
    doctorLicense: string;

    @IsUUID()
    problemId: string;

    @IsUUID()
    @IsOptional()
    evolutionId?: string;

    /** Days supply for refill: 30, 60, or 90 */
    @IsIn([30, 60, 90])
    daysSupply: 30 | 60 | 90;
}

export class ProlongedPrescriptionPlanDto {
    @IsUUID()
    patientId: string;

    @IsUUID()
    professionalId: string;

    @IsUUID()
    problemId: string;

    @IsUUID()
    @IsOptional()
    evolutionId?: string;

    @IsString()
    dciName: string;

    @IsString()
    @IsOptional()
    brandName?: string;

    @IsString()
    @IsOptional()
    snomedCtArCode?: string;

    @IsString()
    drugName: string;

    @IsString()
    dose: string;

    @IsString()
    frequency: string;

    @IsString()
    @IsOptional()
    route?: string;

    @IsString()
    doctorLicense: string;

    /** Number of monthly prescriptions; default regulatory flow = 3 */
    @IsNumber()
    @IsOptional()
    @Min(1)
    @Max(6)
    installments?: number;
}

export class SignPrescriptionDto {
    @IsString()
    doctorLicense: string;

    @IsIn(['local_hash', 'pfdr'])
    @IsOptional()
    signatureProvider?: 'local_hash' | 'pfdr';

    @IsString()
    @IsOptional()
    pfdrTransactionId?: string;

    @IsIn(['json', 'pdf'])
    @IsOptional()
    format?: 'json' | 'pdf';

    @IsString()
    @IsOptional()
    validationBaseUrl?: string;
}

export class SignEvolutionDto {
    @IsString()
    doctorLicense: string;

    @IsIn(['local_hash', 'pfdr'])
    @IsOptional()
    signatureProvider?: 'local_hash' | 'pfdr';

    @IsString()
    @IsOptional()
    pfdrTransactionId?: string;
}

export class SignProblemThreadDto {
    @IsString()
    doctorLicense: string;

    @IsIn(['local_hash', 'pfdr'])
    @IsOptional()
    signatureProvider?: 'local_hash' | 'pfdr';

    @IsString()
    @IsOptional()
    pfdrTransactionId?: string;
}
