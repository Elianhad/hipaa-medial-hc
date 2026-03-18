import {
  IsString,
  IsEmail,
  IsOptional,
  IsUUID,
  Length,
  IsNumber,
  IsBoolean,
  Min,
} from 'class-validator';

export class CreateProfessionalDto {
  @IsUUID()
  tenantId: string;

  @IsUUID()
  userId: string;

  @IsString()
  @Length(1, 100)
  licenseNumber: string;

  // The following fields are populated by MockSisaService
  // and should not be set directly by the client
  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  specialty?: string;

  @IsString()
  @IsOptional()
  professionalType?: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsString()
  @IsOptional()
  photoUrl?: string;

  @IsString()
  @IsOptional()
  signatureUrl?: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  consultationFee?: number;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}
