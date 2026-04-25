import {
    IsDateString,
    IsEnum,
    IsOptional,
    IsString,
    IsUUID,
    Length,
    MaxLength,
    ValidateIf,
} from 'class-validator';
import {
    ProblemCategory,
    ProblemClinicalStatus,
    ProblemVerificationStatus,
} from '../problem.entity';

export class CreateProblemWithEvolutionDto {
    // ── Datos del problema ────────────────────────────────────────────────────

    @IsUUID()
    patientId: string;

    @IsString()
    @MaxLength(500)
    title: string;

    @IsEnum(ProblemCategory)
    category: ProblemCategory;

    /**
     * Estado de verificación diagnóstica inicial.
     * Por defecto provisional; puede enviarse como confirmado si viene referido.
     */
    @IsEnum(ProblemVerificationStatus)
    @IsOptional()
    verificationStatus?: ProblemVerificationStatus = ProblemVerificationStatus.PROVISIONAL;

    @IsEnum(ProblemClinicalStatus)
    @IsOptional()
    clinicalStatus?: ProblemClinicalStatus = ProblemClinicalStatus.ACTIVE;

    /**
     * Código SNOMED CT obligatorio para deduplicación y trazabilidad FHIR.
     * Si el profesional no cuenta con código exacto, puede usar el término
     * de búsqueda y el sistema buscará el mejor match.
     */
    @IsString()
    @Length(1, 30)
    snomedCode: string;

    @IsString()
    @MaxLength(20)
    @IsOptional()
    icd10Code?: string;

    @IsString()
    @MaxLength(20)
    @IsOptional()
    icd11Code?: string;

    @IsDateString()
    @IsOptional()
    onsetDate?: string;

    /**
     * Cuando el profesional decide registrar como recidiva de un problema previo.
     * Al enviarlo, el service forzará clinicalStatus = RECURRENCE.
     */
    @IsUUID()
    @IsOptional()
    recurrenceOfProblemId?: string;

    // ── Evolución inicial (SOAP completo) ─────────────────────────────────────

    /**
     * Enfermedad actual / subjetivo (MC + EA).
     */
    @IsString()
    @IsOptional()
    subjective?: string;

    /**
     * Examen físico / hallazgos objetivos.
     */
    @IsString()
    @IsOptional()
    objective?: string;

    /**
     * Impresión diagnóstica / evaluación.
     */
    @IsString()
    @IsOptional()
    assessment?: string;

    /**
     * Plan terapéutico.
     */
    @IsString()
    @IsOptional()
    plan?: string;

    /**
     * UUID del profesional que registra la evolución.
        * Si no se envía, se resuelve en backend desde el usuario autenticado.
     */
    @IsUUID()
        @IsOptional()
        professionalId?: string;

    /**
     * Fecha de la evolución; si no se provee, se asigna la fecha actual.
     */
    @IsDateString()
    @IsOptional()
    evolutionDate?: string;

    /**
     * Hora de la evolución (HH:MM); si no se provee, se asigna la hora actual.
     */
    @IsString()
    @IsOptional()
    evolutionTime?: string;
}
