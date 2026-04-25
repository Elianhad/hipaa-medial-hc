import { IsString, IsOptional, IsUUID, IsBoolean, IsObject, IsArray } from 'class-validator';

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
    @IsArray()
    weeklySchedule?: any[];

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
    @IsArray()
    weeklySchedule?: any[];

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
    weeklySchedule: any[];
    appointmentRules: Record<string, any>;
    isMainLocation: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
