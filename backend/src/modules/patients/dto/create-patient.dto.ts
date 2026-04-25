import {
  IsString,
  IsBoolean,
  IsEnum,
  IsEmail,
  IsOptional,
  Length,
} from 'class-validator';
import { SexType } from '../patient.entity';

export class CreatePatientDto {
  @IsString()
  @Length(7, 20)
  dni: string;

  @IsEnum(SexType)
  sex: SexType;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  birthDate?: string;

  @IsString()
  @IsOptional()
  photoUrl?: string;

  @IsBoolean()
  @IsOptional()
  physicalDniVerified?: boolean;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  province?: string;

  @IsString()
  @IsOptional()
  postalCode?: string;

  @IsString()
  @IsOptional()
  primaryInsuranceId?: string;

  @IsString()
  @IsOptional()
  secondaryInsuranceId?: string;

  @IsString()
  @IsOptional()
  insuranceMemberNumber?: string;
}
