import {
    IsArray,
    IsBoolean,
    IsNumber,
    IsObject,
    IsOptional,
    IsString,
    MaxLength,
    Min,
} from 'class-validator';

export class UpdateProfessionalConfigDto {
    @IsOptional()
    @IsString()
    @MaxLength(200)
    specialty?: string;

    @IsOptional()
    @IsString()
    bio?: string;

    @IsOptional()
    @IsString()
    photoUrl?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    consultationFee?: number;

    @IsOptional()
    @IsBoolean()
    isPublic?: boolean;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    acceptedInsurances?: string[];

    @IsOptional()
    @IsObject()
    weeklySchedule?: Record<string, any>;

    @IsOptional()
    @IsObject()
    appointmentRules?: Record<string, any>;
}
