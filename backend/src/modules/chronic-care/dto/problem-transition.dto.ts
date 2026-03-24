import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export type ProblemCategory = 'acute' | 'chronic' | 'symptomatic';
export type ProblemClinicalStatus = 'active' | 'resolved' | 'inactive' | 'recurrent';

enum ProblemCategoryEnum {
    ACUTE = 'acute',
    CHRONIC = 'chronic',
    SYMPTOMATIC = 'symptomatic',
}

enum ProblemClinicalStatusEnum {
    ACTIVE = 'active',
    RESOLVED = 'resolved',
    INACTIVE = 'inactive',
    RECURRENT = 'recurrent',
}

export class PromoteProblemDto {
    @IsString()
    @MaxLength(500)
    newTitle: string;

    @IsEnum(ProblemCategoryEnum)
    @IsOptional()
    newCategory?: ProblemCategory = 'chronic';

    @IsEnum(ProblemClinicalStatusEnum)
    @IsOptional()
    newClinicalStatus?: ProblemClinicalStatus = 'active';

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
