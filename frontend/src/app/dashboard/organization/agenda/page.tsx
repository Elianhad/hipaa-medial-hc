'use client';

import { useEffect, useMemo, useState } from 'react';
import { OrganizationPortalGuard } from '../../../../components/OrganizationPortalGuard';
import {
    getOrgAgenda,
    type OrgAgendaItem,
} from '@/lib/organization-api';

const attendanceBadge: Record<OrgAgendaItem['attendance'], string> = {
    pending: 'border border-amber-200 bg-amber-100 text-amber-800',
    present: 'border border-emerald-200 bg-emerald-100 text-emerald-800',
    absent: 'border border-rose-200 bg-rose-100 text-rose-800',
};

const attendanceLabel: Record<OrgAgendaItem['attendance'], string> = {
    pending: 'Pendiente',
    present: 'Presente',
    absent: 'Ausente',
};

export default function OrgAgendaPage() {
    const [agenda, setAgenda] = useState<OrgAgendaItem[]>([]);
    const [isApiConnected, setIsApiConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<string>('Todos');
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        const loadAgenda = async () => {
            try {
                const data = await getOrgAgenda();
                setAgenda(data.items);
                setIsApiConnected(true);
                setLoadError(null);
            } catch (error: any) {
                setIsApiConnected(false);
                setLoadError(error?.message ?? 'No se pudo conectar con backend.');
            } finally {
                setIsLoading(false);
            }
        };
        loadAgenda();
    }, []);

    const professionalNames = useMemo(() => {
        const names = new Set(agenda.map((a) => a.professionalName).filter(Boolean) as string[]);
        return ['Todos', ...Array.from(names)];
    }, [agenda]);

    const filtered = useMemo(
        () =>
            activeFilter === 'Todos'
                ? agenda
                : agenda.filter((a) => a.professionalName === activeFilter),
        [agenda, activeFilter],
    );

    return (
        <OrganizationPortalGuard>
            <main className="min-h-screen py-10 px-4">
                <div className="max-w-6xl mx-auto space-y-6">
                    <header className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm sm:p-8">
                        <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Panel organizacional</p>
                        <h1 className="mt-3 text-3xl font-bold text-slate-900">Agenda Organizacional</h1>
                        <p className="mt-2 text-slate-600">Vista de turnos de todos los profesionales para hoy</p>
                        <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
                            <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sky-700">Operación diaria</span>
                            <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-violet-700">Vista consolidada</span>
                        </div>
                    </header>

                    {/* Backend connectivity banner */}
                    {!isApiConnected && !isLoading && (
                        <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-800">
                            No se pudo cargar agenda en vivo. {loadError ?? 'Revisá tenant/autenticación y backend.'}
                        </div>
                    )}

                    {/* Professional filter */}
                    <div className="flex flex-wrap gap-3 rounded-2xl border border-sky-200 bg-sky-50/50 p-4">
                        <span className="mr-2 self-center text-sm text-sky-800">Filtrar por profesional:</span>
                        {professionalNames.map((f) => (
                            <button
                                key={f}
                                type="button"
                                onClick={() => setActiveFilter(f)}
                                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${activeFilter === f
                                        ? 'border-sky-300 bg-white text-sky-800 font-medium shadow-sm'
                                        : 'border-sky-200 bg-sky-50/40 text-slate-600 hover:border-sky-300 hover:text-sky-700'
                                    }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>

                    <section className="overflow-hidden rounded-2xl border border-sky-200 bg-white/90 shadow-sm">
                        <table className="w-full text-sm">
                            <thead className="border-b border-sky-100 bg-sky-50/70">
                                <tr>
                                    <th className="text-left px-6 py-3 font-medium text-slate-600">Hora</th>
                                    <th className="text-left px-6 py-3 font-medium text-slate-600">Profesional</th>
                                    <th className="text-left px-6 py-3 font-medium text-slate-600">Paciente</th>
                                    <th className="text-left px-6 py-3 font-medium text-slate-600">Motivo</th>
                                    <th className="text-left px-6 py-3 font-medium text-slate-600">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                            Cargando agenda…
                                        </td>
                                    </tr>
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                            No hay turnos para el filtro seleccionado
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((item) => (
                                        <tr key={item.id} className="transition-colors hover:bg-sky-50/40">
                                            <td className="px-6 py-4 font-mono text-slate-700">
                                                {new Date(item.scheduledAt).toLocaleTimeString('es-AR', {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    hour12: false,
                                                })}
                                            </td>
                                            <td className="px-6 py-4 text-slate-800 font-medium">
                                                {item.professionalName ?? '—'}
                                            </td>
                                            <td className="px-6 py-4 text-slate-700">{item.patientName}</td>
                                            <td className="px-6 py-4 text-slate-600">{item.reason ?? 'Consulta general'}</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${attendanceBadge[item.attendance]}`}>
                                                    {attendanceLabel[item.attendance]}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </section>
                </div>
            </main>
        </OrganizationPortalGuard>
    );
}

