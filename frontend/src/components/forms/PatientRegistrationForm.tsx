'use client';

import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';



// ---------------------------------------------------------------------------
// DNI barcode parser
// Format: XXXXXXXNNN@APELLIDO@NOMBRE@NOMBRE2@SEXO@NRODNI@E@DD/MM/AAAA@DD/MM/AAAA@201
// SEXO is either M, F or X, used as the anchor to find the rest of the fields.
// ---------------------------------------------------------------------------
interface DniScanResult {
  dni: string;
  lastName: string;
  firstName: string;
  sex: 'M' | 'F' | 'X';
  birthDate: string; // YYYY-MM-DD
}

function parseDniBarcode(raw: string): DniScanResult | null {
  try {
    const parts = raw.trim().split('@').filter(Boolean);
    // Find the index of the sex field (M, F, or X)
    const sexIdx = parts.findIndex((p) => /^[MFX]$/.test(p));
    if (sexIdx === -1) return null;

    const sex = parts[sexIdx] as 'M' | 'F' | 'X';
    const nroDni = parts[sexIdx + 1]?.replace(/\D/g, '');
    // Apellido and nombre(s) sit before the sex field.
    // The structure before sexIdx is: [tramiteChunk, APELLIDO, ...NOMBRE_PARTS]
    // tramiteChunk is index 0 (contains the nro de trámite prefix), APELLIDO is index 1
    const lastName = parts[1] ?? '';
    // Everything between index 2 and sexIdx-1 (inclusive) is the name parts
    const firstNameParts = parts.slice(2, sexIdx);
    const firstName = firstNameParts.join(' ').trim();

    // Dates are after the 'E' field: ..., E, birthDate, updateDate, 201
    const eIdx = parts.findIndex((p, i) => i > sexIdx && p === 'E');
    const rawBirthDate = eIdx !== -1 ? parts[eIdx + 1] : undefined;

    let birthDate = '';
    if (rawBirthDate) {
      const [day, month, year] = rawBirthDate.split('/');
      if (day && month && year) {
        birthDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }

    if (!nroDni || nroDni.length < 7) return null;

    return { dni: nroDni, lastName, firstName, sex, birthDate };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
const schema = z.object({
  dni: z
    .string()
    .min(7, 'El DNI debe tener al menos 7 dígitos')
    .max(20)
    .regex(/^\d+$/, 'Solo dígitos'),
  sex: z.enum(['M', 'F', 'X'], { required_error: 'Seleccione el sexo' }),
  firstName: z.string().min(1, 'El nombre es requerido'),
  lastName: z.string().min(1, 'El apellido es requerido'),
  birthDate: z.string().optional(),
  photoUrl: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postalCode: z.string().optional(),
  primaryInsuranceId: z.string().uuid('ID inválido').optional().or(z.literal('')),
  insuranceMemberNumber: z.string().optional(),
  physicalDniVerified: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function PatientRegistrationForm({ onSuccess }: { onSuccess?: (patientId: string) => void }) {
  const [scanVerified, setScanVerified] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const scanRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { physicalDniVerified: false },
  });

  /** Called when the scanner fires (usually ends with Enter which triggers onKeyDown). */
  function handleScanInput(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const raw = scanInput.trim();
    if (!raw) return;

    const result = parseDniBarcode(raw);
    if (!result) {
      toast.error('No se pudo leer el código del DNI. Verifique el código o ingrese los datos manualmente.');
      setScanInput('');
      return;
    }

    setValue('dni', result.dni, { shouldValidate: true });
    setValue('lastName', result.lastName, { shouldValidate: true });
    setValue('firstName', result.firstName, { shouldValidate: true });
    setValue('sex', result.sex, { shouldValidate: true });
    if (result.birthDate) {
      setValue('birthDate', result.birthDate, { shouldValidate: true });
    }
    setValue('physicalDniVerified', true);
    setScanVerified(true);
    setScanInput('');

    toast.success('DNI leído correctamente — revise y complete los datos');
  }

  async function onSubmit(data: FormData) {
    try {
      const res = await fetch('/api/protected/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message ?? 'Error al registrar el paciente');
      }

      const patient = await res.json();
      toast.success('Paciente registrado correctamente');
      onSuccess?.(patient.id);
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  const sex = watch('sex');

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="max-w-2xl mx-auto space-y-6 p-6 bg-white rounded-xl shadow"
    >
      <h2 className="text-2xl font-semibold text-slate-800">
        Registro de Paciente
      </h2>

      {/* ── DNI Scanner ──────────────────────────────────────────── */}
      <section className="space-y-3 rounded-lg border border-indigo-200 bg-indigo-50 p-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">📷</span>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-indigo-700">
            Lectura de DNI con escáner
          </h3>
          {scanVerified && (
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              ✅ DNI leído
            </span>
          )}
        </div>

        <p className="text-xs text-indigo-600">
          Haga clic en el campo y escanee el código de barras del DNI. Los datos se completarán automáticamente.
          Si no cuenta con escáner, complete los campos manualmente a continuación.
        </p>

        <input
          ref={scanRef}
          type="text"
          value={scanInput}
          onChange={(e) => setScanInput(e.target.value)}
          onKeyDown={handleScanInput}
          placeholder="Haga clic aquí y escanee el DNI…"
          className="block w-full rounded-md border border-indigo-300 bg-white px-3 py-2 text-sm placeholder:text-indigo-300 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </section>

      {/* ── Datos de Identidad ───────────────────────────────────── */}
      <section className="space-y-4 rounded-lg border border-slate-200 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Datos de identidad
          {scanVerified && (
            <span className="ml-2 text-xs font-normal normal-case text-green-600">
              (completado por escáner — puede editar si es necesario)
            </span>
          )}
        </h3>

        <div className="grid grid-cols-2 gap-4">
          {/* DNI */}
          <div>
            <label className="block text-sm font-medium text-slate-700">
              DNI <span className="text-red-500">*</span>
            </label>
            <input
              {...register('dni')}
              type="text"
              inputMode="numeric"
              placeholder="12345678"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
            />
            {errors.dni && (
              <p className="mt-1 text-xs text-red-600">{errors.dni.message}</p>
            )}
          </div>

          {/* Sex */}
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Sexo registral <span className="text-red-500">*</span>
            </label>
            <select
              {...register('sex')}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Seleccionar…</option>
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
              <option value="X">No binario / X</option>
            </select>
            {errors.sex && (
              <p className="mt-1 text-xs text-red-600">{errors.sex.message}</p>
            )}
          </div>

          {/* Apellido */}
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Apellido <span className="text-red-500">*</span>
            </label>
            <input
              {...register('lastName')}
              type="text"
              placeholder="García"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
            />
            {errors.lastName && (
              <p className="mt-1 text-xs text-red-600">{errors.lastName.message}</p>
            )}
          </div>

          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Nombre/s <span className="text-red-500">*</span>
            </label>
            <input
              {...register('firstName')}
              type="text"
              placeholder="Juan Carlos"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
            />
            {errors.firstName && (
              <p className="mt-1 text-xs text-red-600">{errors.firstName.message}</p>
            )}
          </div>

          {/* Fecha de nacimiento */}
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Fecha de nacimiento
            </label>
            <input
              {...register('birthDate')}
              type="date"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Identity verification status badge */}
        <div className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs ${
          scanVerified
            ? 'bg-green-50 text-green-700'
            : 'bg-amber-50 text-amber-700'
        }`}>
          <span>{scanVerified ? '✅' : '⚠️'}</span>
          <span>
            {scanVerified
              ? 'Identidad verificada con documento físico (DNI escaneado)'
              : 'Identidad sin verificación digital — datos ingresados manualmente'}
          </span>
        </div>
      </section>

      {/* ── Datos de Contacto y Afiliación ───────────────────────── */}
      <section className="space-y-4 rounded-lg border border-slate-200 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Datos de contacto y afiliación
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input
              {...register('email')}
              type="email"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Teléfono</label>
            <input
              {...register('phone')}
              type="tel"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700">Dirección</label>
            <input
              {...register('address')}
              type="text"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Ciudad</label>
            <input
              {...register('city')}
              type="text"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Provincia</label>
            <input
              {...register('province')}
              type="text"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">N° de afiliado</label>
            <input
              {...register('insuranceMemberNumber')}
              type="text"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500"
            />
          </div>
        </div>
      </section>

      {/* ── Submit ───────────────────────────────────────────────── */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Guardando…' : 'Registrar Paciente'}
      </button>
    </form>
  );
}
