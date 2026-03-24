import {
    IsUUID,
    IsString,
    IsOptional,
    IsArray,
    ValidateNested,
    IsNumber,
    IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { StructuredGoal } from '../entities/problem-baseline.entity';

export class StructuredGoalDto implements StructuredGoal {
    @IsString()
    loincCode: string;

    @IsString()
    display: string;

    @IsIn(['<', '<=', '>', '>=', '=='])
    operator: string;

    @IsNumber()
    targetValue: number;

    @IsString()
    unit: string;
}

export class UpsertBaselineDto {
    /** Target problem (must be CHRONIC category) */
    @IsUUID()
    problemId: string;

    @IsUUID()
    patientId: string;

    /** Free text goals, e.g. ["TA sistólica < 140 mmHg"] */
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    clinicalGoals?: string[];

    /** Structured goals with LOINC + threshold */
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => StructuredGoalDto)
    @IsOptional()
    goalsStructured?: StructuredGoalDto[];

    /** LOINC codes to auto-fetch on routine control visit */
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    autoFetchLoincCodes?: string[];

    @IsString()
    @IsOptional()
    sustainingTreatmentNote?: string;
}
