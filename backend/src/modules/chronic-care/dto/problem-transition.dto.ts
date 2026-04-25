import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ProblemCategory, ProblemClinicalStatus } from '../../clinical-records/problem.entity';

enum ProblemCategoryEnum {
    ENCOUNTER_DIAGNOSIS = 'encounter_diagnosis',
    PROBLEM_LIST_ITEM = 'problem_list_item',
    HEALTH_CONCERN = 'health_concern',
}

enum ProblemClinicalStatusEnum {
    ACTIVE = 'active',
    RECURRENCE = 'recurrence',
    INACTIVE = 'inactive',
    REMISSION = 'remission',
    RESOLVED = 'resolved',
}

export class PromoteProblemDto {
    @IsString()
    @MaxLength(500)
    newTitle: string;

    @IsEnum(ProblemCategoryEnum)
    @IsOptional()
    newCategory?: ProblemCategory = ProblemCategory.PROBLEM_LIST_ITEM;

    @IsEnum(ProblemClinicalStatusEnum)
    @IsOptional()
    newClinicalStatus?: ProblemClinicalStatus = ProblemClinicalStatus.ACTIVE;

    @IsString()
    @IsOptional()
    @MaxLength(30)
    snomedCode?: string;

    @IsString()
    @IsOptional()
    @MaxLength(20)
    icd10Code?: string;

    @IsString()
    @IsOptional()
    @MaxLength(20)
    icd11Code?: string;

    @IsString()
    @IsOptional()
    reasonNote?: string;
}

export class DiscardProblemDto {
    @IsString()
    closureSummary: string;

    @IsString()
    @IsOptional()
    reasonNote?: string;
}
