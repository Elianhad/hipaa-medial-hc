'use client';

import { useEffect, useState } from 'react';
import { OrganizationPortalGuard } from '../../../../components/OrganizationPortalGuard';
import {
    getOrgBilling,
    DEMO_ORG_BILLING,
    type OrgBillingResponse,
    type OrgBillingItem,
} from '@/lib/organization-api';

const statusBadge: Record<OrgBillingItem['status'], string> = {
    pending: 'bg-amber-100 text-amber-800',
    paid: 'bg-emerald-100 text-emerald-800',
    rejected: 'bg-rose-100 text-rose-800',
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
    const [billing, setBilling] = useState<OrgBillingResponse>(DEMO_ORG_BILLING);
    const [isApiConnected, setIsApiConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadBilling = async () => {
            try {
                const data = await getOrgBilling();
                setBilling(data);
                setIsApiConnected(true);
            } catch {
                setIsApiConnected(false);
            } finally {
                setIsLoading(false);
            }
        };
        loadBilling();
    }, []);

    return (
        <OrganizationPortalGuard>
            <main className="min-h-screen bg-slate-50 py-10 px-4">
                <div className="max-w-5xl mx-auto space-y-6">
                    <header>
                        <h1 className="text-3xl font-bold text-slate-900">Facturación</h1>
                        <p className="text-slate-500 mt-1">Prestaciones, obras sociales y liquidaciones</p>
                    </header>

                    {/* Demo mode banner */}
                    {!isApiConnected && !isLoading && (
                        <div className="rounded-lg bg-orange-50 border border-orange-200 px-4 py-3 text-sm text-orange-800">
                            🧾 Mostrando datos de facturación demo. El módulo de billing está en desarrollo.
                        </div>
                    )}

                    {/* KPI row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
                            <p className="text-2xl font-bold text-amber-600">
                                {isLoading ? '…' : formatARS(billing.pendingAmount)}
                            </p>
                            <p className="text-sm text-slate-500 mt-1">Pendiente de cobro</p>
                        </div>
                        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
                            <p className="text-2xl font-bold text-green-600">
                                {isLoading ? '…' : formatARS(billing.paidThisMonth)}
                            </p>
                            <p className="text-sm text-slate-500 mt-1">Cobrado este mes</p>
                        </div>
                        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
                            <p className="text-2xl font-bold text-red-600">
                                {isLoading ? '…' : billing.rejectedCount}
                            </p>
                            <p className="text-sm text-slate-500 mt-1">Prestaciones rechazadas</p>
                        </div>
                    </div>

                    {/* Billing items table */}
                    <section className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100">
                            <h2 className="font-semibold text-slate-800">Prestaciones recientes</h2>
                        </div>
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
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
                                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
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

