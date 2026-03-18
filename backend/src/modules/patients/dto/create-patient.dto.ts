import {
  IsString,
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

  // The following fields are populated by MockRENAPERService
  // and should not be set directly by the client
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  photoUrl?: string;

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
