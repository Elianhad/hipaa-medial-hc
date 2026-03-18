import {
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsDateString,
  Matches,
} from 'class-validator';
import { RecordType } from '../clinical-evolution.entity';

export class CreateEvolutionDto {
  @IsUUID()
  patientId: string;

  @IsUUID()
  professionalId: string;

  @IsUUID()
  @IsOptional()
  appointmentId?: string;

  @IsUUID()
  @IsOptional()
  problemId?: string;

  @IsEnum(RecordType)
  @IsOptional()
  recordType?: RecordType = RecordType.SOAP;

  @IsDateString()
  evolutionDate: string;

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'evolutionTime must be HH:MM',
  })
  evolutionTime: string;

  @IsString()
  @IsOptional()
  subjective?: string;

  @IsString()
  @IsOptional()
  objective?: string;

  @IsString()
  @IsOptional()
  assessment?: string;

  @IsString()
  @IsOptional()
  plan?: string;

  @IsUUID()
  @IsOptional()
  nomenclatureId?: string;
}
