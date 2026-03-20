'use client';

import { useEffect, useState } from 'react';
import { OrganizationPortalGuard } from '../../../../components/OrganizationPortalGuard';
import {
    getOrgStaff,
    DEMO_ORG_STAFF,
    type OrgStaffMember,
} from '@/lib/organization-api';

const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    staff: 'Profesional',
};

export default function OrgStaffPage() {
    const [staff, setStaff] = useState<OrgStaffMember[]>(DEMO_ORG_STAFF);
    const [isApiConnected, setIsApiConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadStaff = async () => {
            try {
                const data = await getOrgStaff();
                setStaff(data.items);
                setIsApiConnected(true);
            } catch {
                setIsApiConnected(false);
            } finally {
                setIsLoading(false);
            }
        };
        loadStaff();
    }, []);

    return (
        <OrganizationPortalGuard>
            <main className="min-h-screen bg-slate-50 py-10 px-4">
                <div className="max-w-5xl mx-auto space-y-6">
                    <header className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">Gestión de Staff</h1>
                            <p className="text-slate-500 mt-1">Profesionales que forman parte de la organización</p>
                        </div>
                        <button
                            type="button"
                            className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                            onClick={() => alert('Funcionalidad disponible en la próxima versión')}
                        >
                            + Agregar profesional
                        </button>
                    </header>

                    {/* Demo mode banner */}
                    {!isApiConnected && !isLoading && (
                        <div className="rounded-lg bg-orange-50 border border-orange-200 px-4 py-3 text-sm text-orange-800">
                            👥 Mostrando staff demo. Al habilitar Auth0/API se sincroniza automáticamente.
                        </div>
                    )}

                    <section className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
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
                                        <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-slate-800">{member.name}</td>
                                            <td className="px-6 py-4 text-slate-600">{member.specialty ?? '—'}</td>
                                            <td className="px-6 py-4 text-slate-600">
                                                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${member.role === 'admin' ? 'bg-orange-100 text-orange-800' : 'bg-slate-100 text-slate-700'}`}>
                                                    {roleLabels[member.role] ?? member.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${member.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                                    {member.isActive ? 'Activo' : 'Inactivo'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    type="button"
                                                    className="text-xs text-slate-500 hover:text-orange-600 transition-colors"
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

