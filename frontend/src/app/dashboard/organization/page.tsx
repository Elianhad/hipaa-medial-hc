'use client';

import { useEffect, useState } from 'react';
import { OrganizationPortalGuard } from '../../../components/OrganizationPortalGuard';
import {
    getOrgSummary,
    DEMO_ORG_SUMMARY,
    type OrgSummaryResponse,
} from '@/lib/organization-api';

export default function OrganizationDashboardPage() {
    const [summary, setSummary] = useState<OrgSummaryResponse>(DEMO_ORG_SUMMARY);
    const [isApiConnected, setIsApiConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadSummary = async () => {
            try {
                const data = await getOrgSummary();
                setSummary(data);
                setIsApiConnected(true);
            } catch {
                setIsApiConnected(false);
            } finally {
                setIsLoading(false);
            }
        };
        loadSummary();
    }, []);

    const kpis = [
        { label: 'Profesionales activos', value: isLoading ? '…' : String(summary.activeProfessionals), icon: '👨‍⚕️', color: 'text-orange-600' },
        { label: 'Consultas hoy', value: isLoading ? '…' : String(summary.todayConsultations), icon: '📋', color: 'text-blue-600' },
        { label: 'Pendientes de auditoría', value: isLoading ? '…' : String(summary.pendingAudit), icon: '🔍', color: 'text-amber-600' },
        { label: 'Facturación en curso', value: isLoading ? '…' : String(summary.billingInProgress), icon: '💰', color: 'text-green-600' },
    ];

    return (
        <OrganizationPortalGuard>
            <main className="min-h-screen bg-slate-50 py-10 px-4">
                <div className="max-w-6xl mx-auto space-y-8">
                    <header>
                        <h1 className="text-3xl font-bold text-slate-900">
                            Portal de la Organización
                        </h1>
                        <p className="mt-1 text-slate-500">
                            Auditoría médica, facturación y gestión de profesionales
                        </p>
                    </header>

                    {/* Demo mode banner */}
                    {!isApiConnected && !isLoading && (
                        <div className="rounded-lg bg-orange-50 border border-orange-200 px-4 py-3 text-sm text-orange-800">
                            📊 Mostrando datos demo. Al habilitar Auth0/API se sincroniza automáticamente.
                        </div>
                    )}

                    {/* KPI cards */}
                    <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                        {kpis.map((card) => (
                            <div
                                key={card.label}
                                className="rounded-xl bg-white p-6 shadow flex items-center gap-4"
                            >
                                <span className="text-4xl">{card.icon}</span>
                                <div>
                                    <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                                    <p className="text-sm text-slate-500">{card.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Quick navigation */}
                    <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                            { href: '/dashboard/organization/agenda', label: '📅 Agenda', desc: 'Ver turnos de todos los profesionales' },
                            { href: '/dashboard/organization/staff', label: '👥 Staff', desc: 'Gestionar profesionales de la organización' },
                            { href: '/dashboard/organization/billing', label: '🧾 Facturación', desc: 'Prestaciones, liquidaciones y auditoría' },
                        ].map((link) => (
                            <a
                                key={link.href}
                                href={link.href}
                                className="rounded-xl bg-white p-5 shadow hover:shadow-md border border-slate-100 hover:border-orange-300 transition-all"
                            >
                                <p className="font-semibold text-slate-800 text-lg">{link.label}</p>
                                <p className="text-sm text-slate-500 mt-1">{link.desc}</p>
                            </a>
                        ))}
                    </section>

                    {/* Audit summary */}
                    <section className="rounded-xl bg-white shadow p-6">
                        <h2 className="text-lg font-semibold text-slate-800 mb-4">
                            Resumen de Auditoría Médica
                        </h2>
                        <p className="text-sm text-slate-500">
                            Cruce de prestaciones HCOP vs nomencladores y obras sociales.
                            Reportes de inconsistencias y control de gestión hospitalaria.
                        </p>
                        <div className="mt-4 rounded-md bg-slate-50 border border-dashed border-slate-300 p-8 text-center text-slate-400 text-sm">
                            {isLoading
                                ? 'Cargando datos de auditoría…'
                                : `${summary.pendingAudit} prestaciones pendientes de revisión`}
                        </div>
                    </section>
                </div>
            </main>
        </OrganizationPortalGuard>
    );
}

