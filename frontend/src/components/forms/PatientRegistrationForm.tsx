'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/v1';

function buildApiUrl(path: string) {
  return `${API_BASE_URL}${path}`;
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
  // Identity fields — locked after RENAPER verification
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  birthDate: z.string().optional(),
  photoUrl: z.string().optional(),
  // Contact fields
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postalCode: z.string().optional(),
  primaryInsuranceId: z.string().uuid('ID inválido').optional().or(z.literal('')),
  insuranceMemberNumber: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface RenaperResult {
  firstName: string;
  lastName: string;
  birthDate: string;
  photoUrl: string;
  verified: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function PatientRegistrationForm() {
  const [identityLocked, setIdentityLocked] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const dni = watch('dni');
  const sex = watch('sex');

  /**
   * Calls the backend RENAPER verification endpoint.
   * On success, auto-fills and LOCKS the identity fields.
   */
  async function handleVerifyIdentity() {
    if (!dni || !sex) {
      toast.error('Ingrese DNI y sexo antes de verificar');
      return;
    }

    setLookupLoading(true);
    try {
      const res = await fetch(
        buildApiUrl(`/patients/verify/${encodeURIComponent(dni)}/${encodeURIComponent(sex)}`),
        { headers: { 'Content-Type': 'application/json' } },
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message ?? 'No se encontró el DNI en RENAPER');
      }

      const data: RenaperResult = await res.json();

      // Auto-fill locked fields
      setValue('firstName', data.firstName, { shouldValidate: true });
      setValue('lastName', data.lastName, { shouldValidate: true });
      setValue('birthDate', data.birthDate, { shouldValidate: true });
      setValue('photoUrl', data.photoUrl);
      setPhotoPreview(data.photoUrl);

      // Lock the fields
      setIdentityLocked(true);
      toast.success('Identidad verificada correctamente');
    } catch (err: any) {
      toast.error(err.message ?? 'Error al verificar identidad');
    } finally {
      setLookupLoading(false);
    }
  }

  async function onSubmit(data: FormData) {
    try {
      const res = await fetch(buildApiUrl('/patients'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message ?? 'Error al registrar el paciente');
      }

      toast.success('Paciente registrado correctamente');
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="max-w-2xl mx-auto space-y-6 p-6 bg-white rounded-xl shadow"
    >
      <h2 className="text-2xl font-semibold text-slate-800">
        Registro de Paciente
      </h2>

      {/* ── Identity verification block ──────────────────────────── */}
      <section className="space-y-4 rounded-lg border border-slate-200 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Verificación de Identidad (RENAPER)
        </h3>

        <div className="grid grid-cols-2 gap-4">
          {/* DNI */}
          <div>
            <label className="block text-sm font-medium text-slate-700">
              DNI *
            </label>
            <input
              {...register('dni')}
              type="text"
              inputMode="numeric"
              placeholder="12345678"
              disabled={identityLocked}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
            />
            {errors.dni && (
              <p className="mt-1 text-xs text-red-600">{errors.dni.message}</p>
            )}
          </div>

          {/* Sex */}
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Sexo registral *
            </label>
            <select
              {...register('sex')}
              disabled={identityLocked}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
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
        </div>

        {/* Verify button */}
        {!identityLocked && (
          <button
            type="button"
            onClick={handleVerifyIdentity}
            disabled={lookupLoading}
            className="mt-2 inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {lookupLoading ? 'Consultando RENAPER…' : '🔍 Verificar Identidad'}
          </button>
        )}

        {/* Locked identity fields */}
        {identityLocked && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
              <span>✅</span>
              <span>Identidad verificada — los campos marcados con 🔒 no pueden editarse</span>
            </div>

            {photoPreview && (
              <div className="flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoPreview}
                  alt="Foto del paciente"
                  className="h-20 w-20 rounded-full object-cover border-2 border-green-400"
                />
                <span className="text-xs text-slate-500">
                  Foto oficial (RENAPER) 🔒
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Nombre 🔒
                </label>
                <input
                  {...register('firstName')}
                  readOnly
                  className="mt-1 block w-full rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-sm cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Apellido 🔒
                </label>
                <input
                  {...register('lastName')}
                  readOnly
                  className="mt-1 block w-full rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-sm cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Fecha de nacimiento 🔒
                </label>
                <input
                  {...register('birthDate')}
                  type="date"
                  readOnly
                  className="mt-1 block w-full rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-sm cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── Contact & insurance ──────────────────────────────────── */}
      <section className="space-y-4 rounded-lg border border-slate-200 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Datos de contacto y afiliación
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Email
            </label>
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
            <label className="block text-sm font-medium text-slate-700">
              Teléfono
            </label>
            <input
              {...register('phone')}
              type="tel"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700">
              Dirección
            </label>
            <input
              {...register('address')}
              type="text"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Ciudad
            </label>
            <input
              {...register('city')}
              type="text"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Provincia
            </label>
            <input
              {...register('province')}
              type="text"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Número de afiliado
            </label>
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
        disabled={isSubmitting || !identityLocked}
        className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Guardando…' : 'Registrar Paciente'}
      </button>

      {!identityLocked && (
        <p className="text-center text-xs text-slate-400">
          Debe verificar la identidad del paciente antes de guardar
        </p>
      )}
    </form>
  );
}
