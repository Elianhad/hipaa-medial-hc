'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { PatientRegistrationForm } from '@/components/forms/PatientRegistrationForm';
import { ArrowLeftIcon, SearchIcon } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/v1';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dni: string;
  sex: string;
  birthDate?: string;
  email?: string;
  phone?: string;
  identityVerified: boolean;
  physicalDniVerified?: boolean;
}

interface PatientsResponse {
  data: Patient[];
  total: number;
  page: number;
  limit: number;
}

function age(birthDate?: string): string {
  if (!birthDate) return '—';
  const diff = Date.now() - new Date(birthDate).getTime();
  return String(Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))) + ' años';
}

export default function ProfessionalPacientesPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const fetchPatients = useCallback(async (p: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/patients?page=${p}&limit=20`);
      if (!res.ok) throw new Error('No se pudo cargar el listado de pacientes');
      const json: PatientsResponse = await res.json();
      setPatients(json.data);
      setTotal(json.total);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchPatients(page); }, [page, fetchPatients]);

  function handlePatientRegistered(patientId: string) {
    setShowModal(false);
    router.push(`/dashboard/professional/pacientes/${patientId}`);
  }

  const filtered = patients.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.firstName.toLowerCase().includes(q) ||
      p.lastName.toLowerCase().includes(q) ||
      p.dni.includes(q)
    );
  });

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#f2f6f5_100%)] py-8 px-4 sm:py-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Panel clinico diario</p>
              <h1 className="mt-3 text-[clamp(2rem,4vw,2.75rem)] font-bold leading-tight text-slate-900">Pacientes</h1>
              <p className="mt-2 text-slate-600">
                Listado de pacientes con acceso rápido al seguimiento individual y a la historia clínica.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">Listado clínico</span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">Busqueda por nombre o DNI</span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">Acceso a historia clinica</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 lg:justify-end">
              <Link
                href="/dashboard/professional"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-400"
              >
                <ArrowLeftIcon className="h-4 w-4" /> Volver al portal
              </Link>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800"
            >
              <span>＋</span> Nuevo Paciente
            </button>
            </div>
          </div>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, apellido o DNI…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-slate-400 focus:bg-white"
            />
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {error && (
            <div className="border-b border-rose-100 bg-rose-50 px-6 py-4 text-sm text-rose-700">
              ⚠️ {error}
            </div>
          )}

          <div className="flex flex-col gap-2 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Listado clínico</h2>
              <p className="mt-1 text-sm text-slate-500">
                Accedé a la historia clínica y verificá identidad antes de continuar con la atención.
              </p>
            </div>
            <p className="text-sm text-slate-500">{search ? 'Busqueda activa' : 'Listado general'}</p>
          </div>

          {isLoading ? (
            <div className="px-6 py-12 text-center text-sm text-slate-400">
              Cargando pacientes…
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-slate-400">
              {search
                ? 'No se encontraron pacientes con ese criterio de búsqueda.'
                : 'No hay pacientes registrados aún. Use el botón "Nuevo Paciente" para dar de alta.'}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/80">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Paciente</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">DNI</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Edad</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Contacto</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Estado ID</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p) => (
                  <tr key={p.id} className="transition-colors hover:bg-slate-50/80">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {p.lastName}, {p.firstName}
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-600">{p.dni}</td>
                    <td className="px-6 py-4 text-slate-600">{age(p.birthDate)}</td>
                    <td className="px-6 py-4 text-slate-500">
                      {p.phone ?? p.email ?? '—'}
                    </td>
                    <td className="px-6 py-4">
                      {p.identityVerified ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                          Verificado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                          Sin verificar
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/dashboard/professional/pacientes/${p.id}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
                      >
                        Ver HC →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {total > 20 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="text-xs font-medium text-slate-700 disabled:text-slate-400"
              >
                ← Anterior
              </button>
              <span className="text-xs text-slate-500">
                Página {page} · {total} pacientes
              </span>
              <button
                disabled={page * 20 >= total}
                onClick={() => setPage((p) => p + 1)}
                className="text-xs font-medium text-slate-700 disabled:text-slate-400"
              >
                Siguiente →
              </button>
            </div>
          )}
        </section>

        <footer className="border-t border-slate-200 pt-6 text-sm text-slate-500">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p>HEED · Portal del Profesional</p>
            <p>Listado, verificacion y acceso a historia clinica</p>
          </div>
        </footer>
      </div>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-slate-50 shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl bg-white/90 backdrop-blur border-b border-slate-200 px-6 py-4">
              <h2 className="font-semibold text-slate-800">Alta de Paciente</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl leading-none"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
            <div className="p-2">
              <PatientRegistrationForm onSuccess={handlePatientRegistered} />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
