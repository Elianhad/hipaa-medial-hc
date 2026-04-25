'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { PatientRegistrationForm } from '@/components/forms/PatientRegistrationForm';

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

export default function OrgPacientesPage() {
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
    <main className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Pacientes</h1>
            <p className="text-slate-500 mt-1">{total} pacientes registrados en la organización</p>
          </div>
          <div className="flex items-center gap-3">
            <a href="/dashboard/organization" className="text-sm text-orange-600 hover:underline">
              ← Organización
            </a>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-orange-700 transition-colors"
            >
              ＋ Nuevo Paciente
            </button>
          </div>
        </header>

        {/* Search */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, apellido o DNI…"
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2.5 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
          />
        </div>

        {/* Table */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          {error && (
            <div className="px-6 py-4 text-sm text-rose-700 bg-rose-50 border-b border-rose-100">⚠️ {error}</div>
          )}
          {isLoading ? (
            <div className="px-6 py-12 text-center text-slate-400 text-sm">Cargando pacientes…</div>
          ) : filtered.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-400 text-sm">
              {search
                ? 'No se encontraron pacientes con ese criterio.'
                : 'No hay pacientes registrados aún.'}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Paciente</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">DNI</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Edad</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Contacto</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Estado ID</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{p.lastName}, {p.firstName}</td>
                    <td className="px-6 py-4 font-mono text-slate-600">{p.dni}</td>
                    <td className="px-6 py-4 text-slate-600">{age(p.birthDate)}</td>
                    <td className="px-6 py-4 text-slate-500">{p.phone ?? p.email ?? '—'}</td>
                    <td className="px-6 py-4">
                      {p.identityVerified ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">✅ Verificado</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">⚠️ Sin verificar</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <a
                        href={`/dashboard/professional/pacientes/${p.id}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-700"
                      >
                        Ver HC →
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {total > 20 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3">
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="text-xs font-medium text-orange-600 disabled:text-slate-400">← Anterior</button>
              <span className="text-xs text-slate-500">Página {page} · {total} pacientes</span>
              <button disabled={page * 20 >= total} onClick={() => setPage((p) => p + 1)} className="text-xs font-medium text-orange-600 disabled:text-slate-400">Siguiente →</button>
            </div>
          )}
        </section>
      </div>

      {/* New Patient Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-slate-50 shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl bg-white/90 backdrop-blur border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="font-semibold text-slate-800">Alta de Paciente</h2>
                <p className="text-xs text-slate-500 mt-0.5">Registro administrativo desde la organización</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none" aria-label="Cerrar">✕</button>
            </div>
            <div className="p-2">
              <PatientRegistrationForm
                onSuccess={(patientId) => {
                  setShowModal(false);
                  router.push(`/dashboard/professional/pacientes/${patientId}`);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
