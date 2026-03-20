'use client';

import Link from 'next/link';
import { useUser } from '@/components/DemoSessionProvider';
import { extractRoles } from '../../lib/auth/roles';
import { getDashboardCardStates } from '../../lib/auth/dashboard-access';

export default function UnifiedDashboardPage() {
    const { user, isLoading } = useUser();

    if (isLoading) {
        return (
            <main className="min-h-[70vh] bg-slate-950 text-white px-6 py-16">
                <div className="mx-auto max-w-4xl rounded-2xl border border-white/10 bg-white/5 p-8">
                    <p className="text-slate-300">Cargando tu dashboard...</p>
                </div>
            </main>
        );
    }

    if (!user) {
        return (
            <main className="min-h-[70vh] bg-slate-950 text-white px-6 py-16">
                <div className="mx-auto max-w-4xl rounded-2xl border border-white/10 bg-white/5 p-8">
                    <h1 className="text-3xl font-semibold">Dashboard Unificado</h1>
                    <p className="mt-3 text-slate-300">
                        Iniciá sesión para ver únicamente los portales habilitados según tu rol.
                    </p>
                    <div className="mt-6 flex flex-wrap gap-3">
                        <Link
                            href="/api/auth/login"
                            className="rounded-lg bg-sky-500 px-5 py-2 text-sm font-medium text-white hover:bg-sky-600"
                        >
                            Ingresar
                        </Link>
                        <Link
                            href="/"
                            className="rounded-lg border border-white/20 px-5 py-2 text-sm font-medium text-white hover:border-white/40"
                        >
                            Volver a inicio
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    const roles = extractRoles(user);
    const cards = getDashboardCardStates(roles);
    const patientCard = cards.find((card) => card.id === 'patient');
    const professionalCard = cards.find((card) => card.id === 'professional');
    const organizationCard = cards.find((card) => card.id === 'organization');

    return (
        <main className="min-h-[70vh] bg-slate-950 text-white px-6 py-16">
            <div className="mx-auto max-w-5xl">
                <h1 className="text-3xl font-semibold">Dashboard Unificado</h1>
                <p className="mt-3 text-slate-300">
                    Elegí tu entrada según los permisos de tu cuenta.
                </p>

                {roles.length === 0 && (
                    <div className="mt-4 rounded-lg border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200">
                        No encontramos roles en tu sesión. Mostramos acceso base de paciente.
                    </div>
                )}

                <div className="mt-8 grid gap-5 md:grid-cols-3">
                    <section className="rounded-2xl border border-sky-400/30 bg-sky-500/10 p-6">
                        <h2 className="text-xl font-semibold text-sky-200">{patientCard?.title ?? 'Paciente'}</h2>
                        <p className="mt-2 text-sm text-slate-200">{patientCard?.description ?? 'Turnos, historial y datos personales.'}</p>
                        <Link
                            href={patientCard?.href ?? '/dashboard/patient'}
                            className="mt-5 inline-flex rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600"
                        >
                            Entrar
                        </Link>
                    </section>

                    <section className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-6">
                        <h2 className="text-xl font-semibold text-emerald-200">{professionalCard?.title ?? 'Profesional'}</h2>
                        <p className="mt-2 text-sm text-slate-200">{professionalCard?.description ?? 'Agenda, pacientes y configuracion.'}</p>
                        {professionalCard?.enabled ? (
                            <Link
                                href={professionalCard.href}
                                className="mt-5 inline-flex rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
                            >
                                Entrar
                            </Link>
                        ) : (
                            <p className="mt-5 text-sm text-slate-300">Sin acceso por rol actual.</p>
                        )}
                    </section>

                    <section className="rounded-2xl border border-orange-400/30 bg-orange-500/10 p-6">
                        <h2 className="text-xl font-semibold text-orange-200">{organizationCard?.title ?? 'Organizacion'}</h2>
                        <p className="mt-2 text-sm text-slate-200">{organizationCard?.description ?? 'Staff, agenda y facturacion.'}</p>
                        {organizationCard?.enabled ? (
                            <Link
                                href={organizationCard.href}
                                className="mt-5 inline-flex rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
                            >
                                Entrar
                            </Link>
                        ) : (
                            <p className="mt-5 text-sm text-slate-300">Sin acceso por rol actual.</p>
                        )}
                    </section>
                </div>
            </div>
        </main>
    );
}