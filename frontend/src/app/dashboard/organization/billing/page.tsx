'use client';

import { useEffect, useState } from 'react';
import { OrganizationPortalGuard } from '../../../../components/OrganizationPortalGuard';
import {
    getOrgBilling,
    type OrgBillingResponse,
    type OrgBillingItem,
} from '@/lib/organization-api';

const EMPTY_BILLING: OrgBillingResponse = {
    pendingAmount: 0,
    paidThisMonth: 0,
    rejectedCount: 0,
    items: [],
};

const statusBadge: Record<OrgBillingItem['status'], string> = {
    pending: 'border border-amber-200 bg-amber-100 text-amber-800',
    paid: 'border border-emerald-200 bg-emerald-100 text-emerald-800',
    rejected: 'border border-rose-200 bg-rose-100 text-rose-800',
};

const statusLabel: Record<OrgBillingItem['status'], string> = {
    pending: 'Pendiente',
    paid: 'Cobrado',
    rejected: 'Rechazado',
};

function formatARS(amount: number): string {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount);
}

export default function OrgBillingPage() {
    const [billing, setBilling] = useState<OrgBillingResponse>(EMPTY_BILLING);
    const [isApiConnected, setIsApiConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        const loadBilling = async () => {
            try {
                const data = await getOrgBilling();
                setBilling(data);
                setIsApiConnected(true);
                setLoadError(null);
            } catch (error: any) {
                setIsApiConnected(false);
                setLoadError(error?.message ?? 'No se pudo conectar con backend.');
            } finally {
                setIsLoading(false);
            }
        };
        loadBilling();
    }, []);

    return (
        <OrganizationPortalGuard>
            <main className="min-h-screen py-10 px-4">
                <div className="max-w-5xl mx-auto space-y-6">
                    <header className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm sm:p-8">
                        <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Panel organizacional</p>
                        <h1 className="mt-3 text-3xl font-bold text-slate-900">Facturación</h1>
                        <p className="mt-2 text-slate-600">Prestaciones, obras sociales y liquidaciones</p>
                        <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
                            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-700">Ciclo de cobro</span>
                            <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-rose-700">Débitos y rechazos</span>
                        </div>
                    </header>

                    {/* Backend connectivity banner */}
                    {!isApiConnected && !isLoading && (
                        <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-800">
                            Facturación no disponible en backend. {loadError ?? 'Módulo pendiente de implementación.'}
                        </div>
                    )}

                    {/* KPI row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-5 shadow-sm">
                            <p className="text-2xl font-bold text-amber-600">
                                {isLoading ? '…' : formatARS(billing.pendingAmount)}
                            </p>
                            <p className="text-sm text-slate-500 mt-1">Pendiente de cobro</p>
                        </div>
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-sm">
                            <p className="text-2xl font-bold text-emerald-600">
                                {isLoading ? '…' : formatARS(billing.paidThisMonth)}
                            </p>
                            <p className="text-sm text-slate-500 mt-1">Cobrado este mes</p>
                        </div>
                        <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-5 shadow-sm">
                            <p className="text-2xl font-bold text-rose-600">
                                {isLoading ? '…' : billing.rejectedCount}
                            </p>
                            <p className="text-sm text-slate-500 mt-1">Prestaciones rechazadas</p>
                        </div>
                    </div>

                    {/* Billing items table */}
                    <section className="overflow-hidden rounded-2xl border border-amber-200 bg-white/90 shadow-sm">
                        <div className="border-b border-amber-100 bg-amber-50/50 px-6 py-4">
                            <h2 className="font-semibold text-slate-800">Prestaciones recientes</h2>
                        </div>
                        <table className="w-full text-sm">
                            <thead className="border-b border-amber-100 bg-amber-50/70">
                                <tr>
                                    <th className="text-left px-6 py-3 font-medium text-slate-600">Fecha</th>
                                    <th className="text-left px-6 py-3 font-medium text-slate-600">Profesional</th>
                                    <th className="text-left px-6 py-3 font-medium text-slate-600">Paciente</th>
                                    <th className="text-left px-6 py-3 font-medium text-slate-600">Prestación</th>
                                    <th className="text-right px-6 py-3 font-medium text-slate-600">Monto</th>
                                    <th className="text-left px-6 py-3 font-medium text-slate-600">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                            Cargando prestaciones…
                                        </td>
                                    </tr>
                                ) : billing.items.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                            No hay prestaciones registradas
                                        </td>
                                    </tr>
                                ) : (
                                    billing.items.map((item) => (
                                        <tr key={item.id} className="transition-colors hover:bg-amber-50/35">
                                            <td className="px-6 py-4 text-slate-600">{item.date}</td>
                                            <td className="px-6 py-4 text-slate-700">{item.professionalName}</td>
                                            <td className="px-6 py-4 text-slate-700">{item.patientName}</td>
                                            <td className="px-6 py-4 text-slate-600">{item.serviceName}</td>
                                            <td className="px-6 py-4 text-right font-medium text-slate-800">{formatARS(item.amount)}</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[item.status]}`}>
                                                    {statusLabel[item.status]}
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

