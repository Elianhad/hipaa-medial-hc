import { IsIn, IsNumber, IsOptional, IsString, Length, Min } from 'class-validator';

export class RegisterUserDto {
    @IsIn(['professional', 'adminOrg'])
    role: 'professional' | 'adminOrg';

    @IsString()
    @Length(1, 255)
    tenantName: string;

    @IsString()
    @Length(3, 100)
    subdomain: string;

    @IsString()
    @IsOptional()
    firstName?: string;

    @IsString()
    @IsOptional()
    lastName?: string;

    @IsString()
    @IsOptional()
    email?: string;

    @IsString()
    @IsOptional()
    licenseNumber?: string;

    @IsString()
    @IsOptional()
    specialty?: string;

    @IsNumber()
    @Min(0)
    @IsOptional()
    consultationFee?: number;
}
