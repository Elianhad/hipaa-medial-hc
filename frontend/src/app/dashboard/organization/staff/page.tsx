'use client';

import { useEffect, useState } from 'react';
import { OrganizationPortalGuard } from '../../../../components/OrganizationPortalGuard';
import {
    getOrgStaff,
    type OrgStaffMember,
} from '@/lib/organization-api';

const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    staff: 'Profesional',
};

export default function OrgStaffPage() {
    const [staff, setStaff] = useState<OrgStaffMember[]>([]);
    const [isApiConnected, setIsApiConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        const loadStaff = async () => {
            try {
                const data = await getOrgStaff();
                setStaff(data.items);
                setIsApiConnected(true);
                setLoadError(null);
            } catch (error: any) {
                setIsApiConnected(false);
                setLoadError(error?.message ?? 'No se pudo conectar con backend.');
            } finally {
                setIsLoading(false);
            }
        };
        loadStaff();
    }, []);

    return (
        <OrganizationPortalGuard>
            <main className="min-h-screen py-10 px-4">
                <div className="max-w-5xl mx-auto space-y-6">
                    <header className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm sm:p-8">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Panel organizacional</p>
                                <h1 className="mt-3 text-3xl font-bold text-slate-900">Gestión de Staff</h1>
                                <p className="mt-2 text-slate-600">Profesionales que forman parte de la organización</p>
                                <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
                                    <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-violet-700">Equipo asistencial</span>
                                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">Estado operativo</span>
                                </div>
                            </div>
                            <button
                                type="button"
                                className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-violet-700"
                                onClick={() => alert('Funcionalidad disponible en la próxima versión')}
                            >
                                + Agregar profesional
                            </button>
                        </div>
                    </header>

                    {/* Backend connectivity banner */}
                    {!isApiConnected && !isLoading && (
                        <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-800">
                            No se pudo cargar staff en vivo. {loadError ?? 'Revisá tenant/autenticación y backend.'}
                        </div>
                    )}

                    <section className="overflow-hidden rounded-2xl border border-violet-200 bg-white/90 shadow-sm">
                        <table className="w-full text-sm">
                            <thead className="border-b border-violet-100 bg-violet-50/70">
                                <tr>
                                    <th className="text-left px-6 py-3 font-medium text-slate-600">Profesional</th>
                                    <th className="text-left px-6 py-3 font-medium text-slate-600">Especialidad</th>
                                    <th className="text-left px-6 py-3 font-medium text-slate-600">Rol</th>
                                    <th className="text-left px-6 py-3 font-medium text-slate-600">Estado</th>
                                    <th className="px-6 py-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                            Cargando staff de la organización…
                                        </td>
                                    </tr>
                                ) : staff.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                            No hay profesionales registrados en la organización
                                        </td>
                                    </tr>
                                ) : (
                                    staff.map((member) => (
                                        <tr key={member.id} className="transition-colors hover:bg-violet-50/35">
                                            <td className="px-6 py-4 font-medium text-slate-800">{member.name}</td>
                                            <td className="px-6 py-4 text-slate-600">{member.specialty ?? '—'}</td>
                                            <td className="px-6 py-4 text-slate-600">
                                                <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${member.role === 'admin' ? 'border-amber-200 bg-amber-100 text-amber-800' : 'border-violet-200 bg-violet-100 text-violet-800'}`}>
                                                    {roleLabels[member.role] ?? member.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${member.isActive ? 'border-emerald-200 bg-emerald-100 text-emerald-800' : 'border-rose-200 bg-rose-100 text-rose-800'}`}>
                                                    {member.isActive ? 'Activo' : 'Inactivo'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    type="button"
                                                    className="rounded-lg border border-violet-200 bg-white px-2.5 py-1 text-xs font-medium text-violet-700 transition hover:border-violet-300 hover:bg-violet-50"
                                                    onClick={() => alert('Funcionalidad disponible en la próxima versión')}
                                                >
                                                    Ver detalle
                                                </button>
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

