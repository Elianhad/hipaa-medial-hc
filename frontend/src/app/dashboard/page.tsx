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
            <main className="min-h-screen px-6 py-16">
                <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white/90 p-8 shadow-sm">
                    <h1 className="text-3xl font-semibold text-slate-900">Centro de Portales</h1>
                    <p className="mt-3 text-slate-600">
                        Iniciá sesión para ver únicamente los portales habilitados según tu rol.
                    </p>
                    <div className="mt-6 flex flex-wrap gap-3">
                        <Link
                            href="/login"
                            className="rounded-lg bg-sky-600 px-5 py-2 text-sm font-medium text-white hover:bg-sky-700"
                        >
                            Ingresar
                        </Link>
                        <Link
                            href="/"
                            className="rounded-lg border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 hover:border-slate-400"
                        >
                            Volver a inicio
                        </Link>
                    </div>
                </div>

                <footer className="mx-auto mt-16 max-w-4xl border-t border-slate-200 pt-6">
                    <div className="flex flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                        <p>HEED · Plataforma de Historia Clínica Inteligente</p>
                        <p>Acceso seguro para pacientes, profesionales y organizaciones</p>
                    </div>
                </footer>
            </main>
        );
    }

    const cards = getDashboardCardStates(roles);

    return (
        <main className="min-h-screen px-4 py-12 sm:px-6 sm:py-16">
            <div className="mx-auto max-w-6xl">
                <section className="rounded-3xl border border-slate-200 bg-white/90 p-7 shadow-sm sm:p-10">
                    <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
                        <div>
                            <p className="text-xs uppercase tracking-[0.26em] text-slate-500">Panel de acceso</p>
                            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">Centro de Portales</h1>
                            <p className="mt-4 max-w-2xl text-slate-600 leading-7">
                                Entrá al entorno correcto segun tus permisos actuales. Cada tarjeta refleja
                                si tu rol tiene acceso directo o si requiere habilitacion.
                            </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Estado de cuenta</p>
                            <div className="mt-4 grid grid-cols-2 gap-3">
                                <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-3">
                                    <p className="text-2xl font-semibold text-sky-700">{roles.length}</p>
                                    <p className="mt-1 text-xs text-slate-500">roles detectados</p>
                                </div>
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
                                    <p className="text-2xl font-semibold text-emerald-700">
                                        {cards.filter((card) => card.enabled).length}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">portales habilitados</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {roles.length === 0 && (
                    <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
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
                                      cardClass: 'border-sky-200 bg-sky-50/70 shadow-sm',
                                      titleClass: 'text-sky-900',
                                      buttonClass: 'bg-sky-600 hover:bg-sky-700',
                                      badgeClass: 'bg-sky-100 text-sky-800 border border-sky-200',
                                  }
                                : card.id === 'professional'
                                  ? {
                                        cardClass: 'border-emerald-200 bg-emerald-50/70 shadow-sm',
                                        titleClass: 'text-emerald-900',
                                        buttonClass: 'bg-emerald-600 hover:bg-emerald-700',
                                        badgeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
                                    }
                                  : {
                                        cardClass: 'border-orange-200 bg-orange-50/70 shadow-sm',
                                        titleClass: 'text-orange-900',
                                        buttonClass: 'bg-orange-600 hover:bg-orange-700',
                                        badgeClass: 'bg-orange-100 text-orange-800 border border-orange-200',
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
                                <p className="mt-3 text-sm text-slate-600 leading-6">{card.description}</p>
                                {card.enabled ? (
                                    <Link
                                        href={card.href}
                                        className={`mt-6 inline-flex rounded-lg px-4 py-2 text-sm font-medium text-white ${style.buttonClass}`}
                                    >
                                        Entrar al portal
                                    </Link>
                                ) : (
                                    <p className="mt-6 text-sm text-slate-500">Sin acceso por rol actual.</p>
                                )}
                            </section>
                        );
                    })}
                </div>

                <footer className="mt-14 border-t border-slate-200 pt-6">
                    <div className="flex flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                        <p>HEED · Centro de Portales</p>
                        <p>Seleccioná tu entorno y continuá con tu flujo de trabajo</p>
                    </div>
                </footer>
            </div>
        </main>
    );
}