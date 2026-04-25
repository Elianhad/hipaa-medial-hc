'use client';

import Link from 'next/link';
import { useUser } from '@/components/SessionProvider';
import { extractRoles } from '../../lib/auth/roles';
import { getDashboardCardStates } from '../../lib/auth/dashboard-access';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function UnifiedDashboardPage() {
    const { user, isLoading } = useUser();
    const router = useRouter();
    const roles = extractRoles(user);

    useEffect(() => {
        if (isLoading || !user) {
            return;
        }

        if (user.appState?.registration?.needsRegistration) {
            router.replace('/new-tenant');
        }
    }, [user, isLoading, router]);

    if (!isLoading && user?.appState?.registration?.needsRegistration) {
        return null;
    }

    if (!user) {
        return (
            <main className="min-h-screen bg-slate-950 text-white px-6 py-16">
                <div className="mx-auto max-w-4xl rounded-2xl border border-white/10 bg-white/5 p-8">
                    <h1 className="text-3xl font-semibold">Centro de Portales</h1>
                    <p className="mt-3 text-slate-300">
                        Iniciá sesión para ver únicamente los portales habilitados según tu rol.
                    </p>
                    <div className="mt-6 flex flex-wrap gap-3">
                        <Link
                            href="/login"
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

                <footer className="mx-auto mt-16 max-w-4xl border-t border-white/10 pt-6">
                    <div className="flex flex-col gap-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                        <p>HEED · Plataforma de Historia Clínica Inteligente</p>
                        <p>Acceso seguro para pacientes, profesionales y organizaciones</p>
                    </div>
                </footer>
            </main>
        );
    }

    const cards = getDashboardCardStates(roles);

    return (
        <main className="min-h-screen bg-slate-950 text-white px-4 py-12 sm:px-6 sm:py-16">
            <div className="mx-auto max-w-6xl">
                <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-7 sm:p-10">
                    <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
                        <div>
                            <p className="text-xs uppercase tracking-[0.26em] text-slate-400">Panel de acceso</p>
                            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Centro de Portales</h1>
                            <p className="mt-4 max-w-2xl text-slate-300 leading-7">
                                Entrá al entorno correcto segun tus permisos actuales. Cada tarjeta refleja
                                si tu rol tiene acceso directo o si requiere habilitacion.
                            </p>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Estado de cuenta</p>
                            <div className="mt-4 grid grid-cols-2 gap-3">
                                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                                    <p className="text-2xl font-semibold text-sky-300">{roles.length}</p>
                                    <p className="mt-1 text-xs text-slate-400">roles detectados</p>
                                </div>
                                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                                    <p className="text-2xl font-semibold text-emerald-300">
                                        {cards.filter((card) => card.enabled).length}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-400">portales habilitados</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {roles.length === 0 && (
                    <div className="mt-6 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200">
                        <p>
                            No encontramos roles activos en tu perfil. Si es tu primer ingreso,
                            completá el alta para habilitar tus accesos.
                        </p>
                    </div>
                )}

                <div className="mt-8 grid gap-5 md:grid-cols-3">
                    {cards.map((card) => {
                        const style =
                            card.id === 'patient'
                                ? {
                                      cardClass: 'border-sky-400/30 bg-sky-500/10',
                                      titleClass: 'text-sky-200',
                                      buttonClass: 'bg-sky-500 hover:bg-sky-600',
                                      badgeClass: 'bg-sky-500/20 text-sky-200',
                                  }
                                : card.id === 'professional'
                                  ? {
                                        cardClass: 'border-emerald-400/30 bg-emerald-500/10',
                                        titleClass: 'text-emerald-200',
                                        buttonClass: 'bg-emerald-500 hover:bg-emerald-600',
                                        badgeClass: 'bg-emerald-500/20 text-emerald-200',
                                    }
                                  : {
                                        cardClass: 'border-orange-400/30 bg-orange-500/10',
                                        titleClass: 'text-orange-200',
                                        buttonClass: 'bg-orange-500 hover:bg-orange-600',
                                        badgeClass: 'bg-orange-500/20 text-orange-200',
                                    };

                        return (
                            <section
                                key={card.id}
                                className={`rounded-2xl border p-6 transition-transform duration-200 hover:-translate-y-1 ${style.cardClass}`}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <h2 className={`text-xl font-semibold ${style.titleClass}`}>{card.title}</h2>
                                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${style.badgeClass}`}>
                                        {card.enabled ? 'Habilitado' : 'Restringido'}
                                    </span>
                                </div>
                                <p className="mt-3 text-sm text-slate-200 leading-6">{card.description}</p>
                                {card.enabled ? (
                                    <Link
                                        href={card.href}
                                        className={`mt-6 inline-flex rounded-lg px-4 py-2 text-sm font-medium text-white ${style.buttonClass}`}
                                    >
                                        Entrar al portal
                                    </Link>
                                ) : (
                                    <p className="mt-6 text-sm text-slate-300">Sin acceso por rol actual.</p>
                                )}
                            </section>
                        );
                    })}
                </div>

                <footer className="mt-14 border-t border-white/10 pt-6">
                    <div className="flex flex-col gap-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                        <p>HEED · Centro de Portales</p>
                        <p>Seleccioná tu entorno y continuá con tu flujo de trabajo</p>
                    </div>
                </footer>
            </div>
        </main>
    );
}