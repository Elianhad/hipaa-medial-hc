'use client';

import { useEffect, useMemo, useState } from 'react';
import { OrganizationPortalGuard } from '../../../../components/OrganizationPortalGuard';
import {
    getOrgAgenda,
    DEMO_ORG_AGENDA,
    type OrgAgendaItem,
} from '@/lib/organization-api';

const attendanceBadge: Record<OrgAgendaItem['attendance'], string> = {
    pending: 'bg-amber-100 text-amber-800',
    present: 'bg-emerald-100 text-emerald-800',
    absent: 'bg-rose-100 text-rose-800',
};

const attendanceLabel: Record<OrgAgendaItem['attendance'], string> = {
    pending: 'Pendiente',
    present: 'Presente',
    absent: 'Ausente',
};

export default function OrgAgendaPage() {
    const [agenda, setAgenda] = useState<OrgAgendaItem[]>(DEMO_ORG_AGENDA);
    const [isApiConnected, setIsApiConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<string>('Todos');

    useEffect(() => {
        const loadAgenda = async () => {
            try {
                const data = await getOrgAgenda();
                setAgenda(data.items);
                setIsApiConnected(true);
            } catch {
                setIsApiConnected(false);
            } finally {
                setIsLoading(false);
            }
        };
        loadAgenda();
    }, []);

    const specialties = useMemo(() => {
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
            <main className="min-h-screen bg-slate-50 py-10 px-4">
                <div className="max-w-6xl mx-auto space-y-6">
                    <header>
                        <h1 className="text-3xl font-bold text-slate-900">Agenda Organizacional</h1>
                        <p className="text-slate-500 mt-1">Vista de turnos de todos los profesionales para hoy</p>
                    </header>

                    {/* Demo mode banner */}
                    {!isApiConnected && !isLoading && (
                        <div className="rounded-lg bg-orange-50 border border-orange-200 px-4 py-3 text-sm text-orange-800">
                            📅 Mostrando agenda demo. Al habilitar Auth0/API se sincroniza automáticamente.
                        </div>
                    )}

                    {/* Professional filter */}
                    <div className="flex gap-3 flex-wrap">
                        <span className="text-sm text-slate-500 self-center mr-2">Filtrar por profesional:</span>
                        {specialties.map((f) => (
                            <button
                                key={f}
                                type="button"
                                onClick={() => setActiveFilter(f)}
                                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                                    activeFilter === f
                                        ? 'border-orange-400 bg-orange-50 text-orange-700 font-medium'
                                        : 'border-slate-200 hover:border-orange-400 hover:text-orange-600'
                                }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>

                    <section className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
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
                                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
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

