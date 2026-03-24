import { IsString, IsOptional, IsUUID, IsBoolean, IsObject } from 'class-validator';

export class CreateProfessionalLocationDto {
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    address?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsObject()
    weeklySchedule?: Record<string, any>;

    @IsOptional()
    @IsObject()
    appointmentRules?: Record<string, any>;

    @IsOptional()
    @IsBoolean()
    isMainLocation?: boolean;
}

export class UpdateProfessionalLocationDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    address?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsObject()
    weeklySchedule?: Record<string, any>;

    @IsOptional()
    @IsObject()
    appointmentRules?: Record<string, any>;

    @IsOptional()
    @IsBoolean()
    isMainLocation?: boolean;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

export class ProfessionalLocationResponseDto {
    id: string;
    professionalId: string;
    tenantId: string;
    name: string;
    address?: string;
    phone?: string;
    weeklySchedule: Record<string, any>;
    appointmentRules: Record<string, any>;
    isMainLocation: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
