'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { CheckCircle, AlertTriangle, Zap, RotateCcw } from 'lucide-react';
import axios from 'axios';

// ── Types ─────────────────────────────────────────────────────────────────────

export type FastTrackMode = 'full_soap' | 'routine_control' | 'decompensation';

interface AutoFetchResult {
    loincCode: string;
    display: string;
    value: number | null;
    unit: string;
    effectiveDate: string;
}

interface AutoAssessmentResult {
    text: string;
    inGoal: boolean;
    details: Array<{ goal: string; inGoal: boolean; latestValue?: number }>;
}

interface FastTrackResponse {
    evolution: { id: string };
    autoFetchResults?: AutoFetchResult[];
    autoAssessment?: AutoAssessmentResult;
}

// ── Validation schema ─────────────────────────────────────────────────────────

const schema = z.object({
    fastTrackMode: z.enum(['full_soap', 'routine_control', 'decompensation']),
    noChangesSO: z.boolean().optional(),
    subjective: z.string().optional(),
    objective: z.string().optional(),
    assessment: z.string().optional(),
    plan: z.string().optional(),
    isDecompensation: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

// ── Props ─────────────────────────────────────────────────────────────────────

interface FastTrackEvolutionFormProps {
    patientId: string;
    professionalId: string;
    problemId: string;
    problemTitle: string;
    /** Called after successful save */
    onSaved?: (evolutionId: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function FastTrackEvolutionForm({
    patientId,
    professionalId,
    problemId,
    problemTitle,
    onSaved,
}: FastTrackEvolutionFormProps) {
    const [mode, setMode] = useState<FastTrackMode>('routine_control');
    const [loading, setLoading] = useState(false);
    const [autoFetch, setAutoFetch] = useState<AutoFetchResult[] | null>(null);
    const [autoAssessment, setAutoAssessment] = useState<AutoAssessmentResult | null>(null);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            fastTrackMode: 'routine_control',
            noChangesSO: false,
            isDecompensation: false,
        },
    });

    const noChanges = watch('noChangesSO');
    const isDecomp = mode === 'decompensation';

    // ── Handlers ───────────────────────────────────────────────────────────────

    const handleModeChange = (newMode: FastTrackMode) => {
        setMode(newMode);
        setValue('fastTrackMode', newMode);
        setValue('isDecompensation', newMode === 'decompensation');
    };

    const handleNoChanges = () => {
        setValue('noChangesSO', true);
        setValue('subjective', 'Sin cambios subjetivos referidos por el paciente.');
    };

    const onSubmit = async (values: FormValues) => {
        setLoading(true);
        try {
            const today = format(new Date(), 'yyyy-MM-dd');
            const now = format(new Date(), 'HH:mm');

            const { data } = await axios.post<FastTrackResponse>(
                '/api/chronic-care/evolutions/fast-track',
                {
                    patientId,
                    professionalId,
                    problemId,
                    evolutionDate: today,
                    evolutionTime: now,
                    ...values,
                },
            );

            if (data.autoFetchResults?.length) setAutoFetch(data.autoFetchResults);
            if (data.autoAssessment) {
                setAutoAssessment(data.autoAssessment);
                if (!values.assessment) {
                    setValue('assessment', data.autoAssessment.text);
                }
            }

            toast.success('Evolución guardada correctamente.');
            onSaved?.(data.evolution.id);
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? 'Error al guardar la evolución.');
        } finally {
            setLoading(false);
        }
    };

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white">
            {/* Problem context header */}
            <div className="mb-5 flex items-center gap-3">
                <Zap size={20} className="text-sky-400" />
                <div>
                    <p className="text-xs text-slate-400">Evolución rápida</p>
                    <h2 className="text-lg font-semibold">{problemTitle}</h2>
                </div>
            </div>

            {/* Mode selector */}
            <div className="mb-6 flex gap-2 rounded-xl bg-slate-800 p-1">
                {(
                    [
                        { value: 'routine_control', label: 'Control Rutina', icon: CheckCircle },
                        { value: 'full_soap', label: 'SOAP Completo', icon: RotateCcw },
                        { value: 'decompensation', label: 'Agudización', icon: AlertTriangle },
                    ] as const
                ).map(({ value, label, icon: Icon }) => (
                    <button
                        key={value}
                        onClick={() => handleModeChange(value)}
                        className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition
              ${mode === value
                                ? value === 'decompensation'
                                    ? 'bg-red-600 text-white'
                                    : 'bg-sky-600 text-white'
                                : 'text-slate-300 hover:text-white'
                            }`}
                    >
                        <Icon size={14} />
                        {label}
                    </button>
                ))}
            </div>

            {/* Decompensation warning banner */}
            {isDecomp && (
                <div className="mb-5 flex items-start gap-3 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3">
                    <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-400" />
                    <p className="text-sm text-red-300">
                        Esta evolución marcará el problema como{' '}
                        <strong>Agudización/Descompensación</strong> y activará una alerta roja en el
                        dashboard.
                    </p>
                </div>
            )}

            {/* Auto-fetch results */}
            {autoFetch && autoFetch.length > 0 && (
                <div className="mb-5 rounded-lg border border-sky-500/30 bg-sky-500/10 p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-sky-400">
                        Últimos valores auto-cargados
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                        {autoFetch.map((r) => (
                            <div key={r.loincCode} className="flex items-center justify-between text-sm">
                                <span className="text-slate-300">{r.display}</span>
                                <span className="font-mono font-semibold text-white">
                                    {r.value !== null ? `${r.value} ${r.unit}` : '—'}
                                    <span className="ml-1 text-xs text-slate-400">({r.effectiveDate})</span>
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Auto-assessment chip */}
            {autoAssessment && (
                <div
                    className={`mb-5 rounded-lg border px-4 py-3 text-sm ${autoAssessment.inGoal
                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                            : 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                        }`}
                >
                    {autoAssessment.inGoal ? (
                        <CheckCircle size={16} className="mr-2 inline" />
                    ) : (
                        <AlertTriangle size={16} className="mr-2 inline" />
                    )}
                    {autoAssessment.text}
                </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Routine control shortcuts */}
                {mode === 'routine_control' && (
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={handleNoChanges}
                            className={`rounded-lg border px-4 py-2 text-sm font-medium transition
                ${noChanges
                                    ? 'border-emerald-500 bg-emerald-600 text-white'
                                    : 'border-white/20 text-slate-300 hover:border-sky-400 hover:text-white'
                                }`}
                        >
                            ✓ Sin cambios / Estable
                        </button>
                    </div>
                )}

                {/* SOAP fields */}
                {(mode !== 'routine_control' || !noChanges) && (
                    <>
                        <SOAPField
                            id="subjective"
                            label="S — Subjetivo"
                            placeholder="Motivo de consulta, síntomas referidos..."
                            register={register('subjective')}
                        />
                        <SOAPField
                            id="objective"
                            label="O — Objetivo"
                            placeholder="Signos vitales, examen físico..."
                            register={register('objective')}
                        />
                    </>
                )}

                <SOAPField
                    id="assessment"
                    label="A — Apreciación"
                    placeholder="Diagnóstico clínico, interpretación..."
                    register={register('assessment')}
                    highlighted={!!autoAssessment}
                />

                <SOAPField
                    id="plan"
                    label="P — Plan"
                    placeholder="Indicaciones, próximo control..."
                    register={register('plan')}
                />

                <div className="flex justify-end gap-3 pt-2">
                    <button
                        type="submit"
                        disabled={loading}
                        className="rounded-lg bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
                    >
                        {loading ? 'Guardando...' : 'Guardar Evolución'}
                    </button>
                </div>
            </form>
        </div>
    );
}

// ── Sub-component: SOAP field ─────────────────────────────────────────────────

interface SOAPFieldProps {
    id: string;
    label: string;
    placeholder: string;
    register: ReturnType<ReturnType<typeof useForm>['register']>;
    highlighted?: boolean;
}

function SOAPField({ id, label, placeholder, register, highlighted }: SOAPFieldProps) {
    return (
        <div>
            <label
                htmlFor={id}
                className={`mb-1.5 block text-xs font-semibold uppercase tracking-wider ${highlighted ? 'text-sky-400' : 'text-slate-400'
                    }`}
            >
                {label}
            </label>
            <textarea
                id={id}
                rows={3}
                placeholder={placeholder}
                className={`w-full rounded-lg border bg-white/5 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1
          ${highlighted
                        ? 'border-sky-500/60 focus:ring-sky-500'
                        : 'border-white/10 focus:ring-sky-600'
                    }`}
                {...register}
            />
        </div>
    );
}
