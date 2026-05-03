'use client';

import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';

function runEditorCommand(command: string) {
  if (typeof document === 'undefined') return;
  document.execCommand(command, false);
}

function editorHtmlToPlainText(html: string): string {
  if (typeof document === 'undefined') return html;
  const container = document.createElement('div');
  container.innerHTML = html;
  return container.innerText.replace(/\u00a0/g, ' ').trim();
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
  const fieldClassName =
    'mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100';

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      patientId,
      professionalId,
      appointmentId,
      evolutionDate: new Date().toISOString().split('T')[0],
      evolutionTime: new Date().toTimeString().slice(0, 5),
      subjective: '',
    },
  });

  const subjectiveEditorRef = useRef<HTMLDivElement | null>(null);
  const subjectiveValue = watch('subjective') ?? '';

  function syncSubjectiveField() {
    const editor = subjectiveEditorRef.current;
    if (!editor) return;
    const plainText = editorHtmlToPlainText(editor.innerHTML);
    setValue('subjective', plainText, { shouldDirty: true, shouldTouch: true });
  }

  function handleEditorAction(command: string) {
    const editor = subjectiveEditorRef.current;
    if (!editor) return;
    editor.focus();
    runEditorCommand(command);
    syncSubjectiveField();
  }

  function clearSubjectiveEditor() {
    const editor = subjectiveEditorRef.current;
    if (!editor) return;
    editor.innerHTML = '';
    setValue('subjective', '', { shouldDirty: true, shouldTouch: true });
  }

  async function onSubmit(data: FormData) {
    try {
      const res = await fetch('/api/protected/clinical-records/evolutions', {
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
      className="space-y-5 rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-sm"
    >
      <h2 className="text-xl font-semibold text-slate-900">
        Nueva Evolución SOAP
      </h2>

      {/* Hidden fields */}
      <input type="hidden" {...register('patientId')} />
      <input type="hidden" {...register('professionalId')} />
      <input type="hidden" {...register('subjective')} />
      {appointmentId && <input type="hidden" {...register('appointmentId')} />}

      {/* Date / Time */}
      <div className="grid grid-cols-1 gap-4 rounded-xl border border-sky-200 bg-sky-50/60 p-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Fecha *
          </label>
          <input
            {...register('evolutionDate')}
            type="date"
            className={fieldClassName}
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
            className={fieldClassName}
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
        <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-4">
          <label className="block text-sm font-medium text-slate-700">
            Asociar a Problema (HCOP)
          </label>
          <select
            {...register('problemId')}
            className={fieldClassName}
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

      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
        <label className="block text-sm font-semibold text-slate-700">
          S — Subjetivo (MC + EA)
        </label>
        <p className="text-xs text-slate-400 mb-2">
          Escribe el relato clínico con formato enriquecido para mejorar legibilidad en la anamnesis.
        </p>

        <div className="mb-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => handleEditorAction('bold')}
            className="rounded-lg border border-emerald-200 bg-white px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            Negrita
          </button>
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => handleEditorAction('italic')}
            className="rounded-lg border border-emerald-200 bg-white px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            Cursiva
          </button>
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => handleEditorAction('insertUnorderedList')}
            className="rounded-lg border border-emerald-200 bg-white px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            Lista
          </button>
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => handleEditorAction('insertOrderedList')}
            className="rounded-lg border border-emerald-200 bg-white px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            Numerada
          </button>
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={clearSubjectiveEditor}
            className="rounded-lg border border-amber-200 bg-white px-2 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50"
          >
            Limpiar
          </button>
        </div>

        <div className="relative">
          {!subjectiveValue && (
            <p className="pointer-events-none absolute left-3 top-2 text-sm text-slate-400">
              MC: Motivo de consulta...\nEA: Enfermedad actual...
            </p>
          )}
          <div
            ref={subjectiveEditorRef}
            contentEditable
            onInput={syncSubjectiveField}
            className="min-h-28 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            aria-label="Campo enriquecido para subjetivo"
            suppressContentEditableWarning
          />
        </div>
      </div>

      {/* SOAP sections */}
      {soapFields.map((field) => (
        <div key={field.key} className="rounded-xl border border-violet-200 bg-violet-50/35 p-4">
          <label className="block text-sm font-semibold text-slate-700">
            {field.label}
          </label>
          <p className="text-xs text-slate-400 mb-1">{field.sublabel}</p>
          <textarea
            {...register(field.key)}
            rows={3}
            placeholder={field.placeholder}
            className="block w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
          />
        </div>
      ))}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-50"
      >
        {isSubmitting ? 'Guardando evolución…' : 'Guardar Evolución'}
      </button>
    </form>
  );
}
