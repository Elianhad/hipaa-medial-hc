import {
    IsString,
    IsOptional,
    IsEnum,
    Length,
    IsUrl,
    IsObject,
} from 'class-validator';
import { TenantType } from '../tenant.entity';

export class CreateTenantDto {
    @IsString()
    @Length(1, 255)
    name: string;

    @IsString()
    @Length(1, 100)
    subdomain: string;

    @IsEnum(TenantType)
    @IsOptional()
    type?: TenantType;

    @IsUrl()
    @IsOptional()
    logoUrl?: string;

    @IsObject()
    @IsOptional()
    settings?: Record<string, unknown>;
}
