import {
    IsUUID,
    IsString,
    IsOptional,
    IsBoolean,
    IsEnum,
    IsDateString,
    IsNumber,
    Min,
    Max,
    IsIn,
} from 'class-validator';
import { RecordType } from '../../clinical-records/clinical-evolution.entity';

export type FastTrackMode = 'full_soap' | 'routine_control' | 'decompensation';

export class CreateFastTrackEvolutionDto {
    @IsUUID()
    patientId: string;

    @IsUUID()
    professionalId: string;

    @IsUUID()
    problemId: string;

    @IsUUID()
    @IsOptional()
    appointmentId?: string;

    @IsIn(['full_soap', 'routine_control', 'decompensation'])
    fastTrackMode: FastTrackMode;

    @IsDateString()
    evolutionDate: string;

    evolutionTime: string;

    // ── S/O fast-track shortcuts ──────────────────────────────────────
    /** True when physician clicks "Sin cambios" / "Estable" */
    @IsBoolean()
    @IsOptional()
    noChangesSO?: boolean;

    // ── SOAP (required for full SOAP, optional for routine) ───────────
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

    // ── Decompensation flag ──────────────────────────────────────────
    @IsBoolean()
    @IsOptional()
    isDecompensation?: boolean;

    @IsEnum(RecordType)
    @IsOptional()
    recordType?: RecordType;
}
