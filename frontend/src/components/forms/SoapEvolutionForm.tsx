'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/v1';

function buildApiUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}

const schema = z.object({
  patientId: z.string().uuid(),
  professionalId: z.string().uuid(),
  appointmentId: z.string().uuid().optional(),
  problemId: z.string().uuid().optional(),
  evolutionDate: z.string().min(1, 'Requerido'),
  evolutionTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato HH:MM'),
  subjective: z.string().optional(),
  objective: z.string().optional(),
  assessment: z.string().optional(),
  plan: z.string().optional(),
  nomenclatureId: z.string().uuid().optional().or(z.literal('')),
});

type FormData = z.infer<typeof schema>;

interface Props {
  patientId: string;
  professionalId: string;
  appointmentId?: string;
  problems?: { id: string; title: string }[];
  onSuccess?: () => void;
}

export function SoapEvolutionForm({
  patientId,
  professionalId,
  appointmentId,
  problems = [],
  onSuccess,
}: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      patientId,
      professionalId,
      appointmentId,
      evolutionDate: new Date().toISOString().split('T')[0],
      evolutionTime: new Date().toTimeString().slice(0, 5),
    },
  });

  async function onSubmit(data: FormData) {
    try {
      const res = await fetch(buildApiUrl('/clinical-records/evolutions'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message ?? 'Error al guardar la evolución');
      }

      toast.success('Evolución guardada correctamente');
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  const soapFields = [
    {
      key: 'subjective' as const,
      label: 'S — Subjetivo',
      sublabel: 'Motivo de consulta y síntomas referidos por el paciente',
      placeholder: 'Paciente refiere…',
    },
    {
      key: 'objective' as const,
      label: 'O — Objetivo',
      sublabel: 'Examen físico y hallazgos objetivos',
      placeholder: 'TA: … FC: … FR: … Temp: …',
    },
    {
      key: 'assessment' as const,
      label: 'A — Apreciación',
      sublabel: 'Diagnóstico / impresión clínica',
      placeholder: 'Diagnóstico presuntivo / definitivo…',
    },
    {
      key: 'plan' as const,
      label: 'P — Plan',
      sublabel: 'Plan terapéutico y próximos pasos',
      placeholder: '1. Tratamiento… 2. Controles… 3. Derivaciones…',
    },
  ] as const;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-5 p-6 bg-white rounded-xl shadow"
    >
      <h2 className="text-xl font-semibold text-slate-800">
        Nueva Evolución SOAP
      </h2>

      {/* Hidden fields */}
      <input type="hidden" {...register('patientId')} />
      <input type="hidden" {...register('professionalId')} />
      {appointmentId && <input type="hidden" {...register('appointmentId')} />}

      {/* Date / Time */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Fecha *
          </label>
          <input
            {...register('evolutionDate')}
            type="date"
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          {errors.evolutionDate && (
            <p className="mt-1 text-xs text-red-600">
              {errors.evolutionDate.message}
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Hora *
          </label>
          <input
            {...register('evolutionTime')}
            type="time"
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          {errors.evolutionTime && (
            <p className="mt-1 text-xs text-red-600">
              {errors.evolutionTime.message}
            </p>
          )}
        </div>
      </div>

      {/* Associate to problem */}
      {problems.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Asociar a Problema (HCOP)
          </label>
          <select
            {...register('problemId')}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Sin asociar</option>
            {problems.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* SOAP sections */}
      {soapFields.map((field) => (
        <div key={field.key}>
          <label className="block text-sm font-semibold text-slate-700">
            {field.label}
          </label>
          <p className="text-xs text-slate-400 mb-1">{field.sublabel}</p>
          <textarea
            {...register(field.key)}
            rows={3}
            placeholder={field.placeholder}
            className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500 resize-y"
          />
        </div>
      ))}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isSubmitting ? 'Guardando evolución…' : 'Guardar Evolución'}
      </button>
    </form>
  );
}
