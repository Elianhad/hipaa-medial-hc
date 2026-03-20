"use client";

import Link from 'next/link';
import { useUser } from '@/components/DemoSessionProvider';
import { extractRoles } from '../lib/auth/roles';
import { getPortalAccessState, LANDING_PORTALS } from '../lib/auth/portal-access';

const features = [
    {
        title: 'Para Pacientes',
        description: 'Gestión integral de tu historia clínica, turnos y validación segura de identidad.',
        icon: '🏥',
    },
    {
        title: 'Para Profesionales',
        description: 'Agenda, gestión de pacientes y evoluciones clínicas SOAP en un solo lugar.',
        icon: '👨‍⚕️',
    },
    {
        title: 'Para Organizaciones',
        description: 'Control multi-profesional, staff management y facturación integrada.',
        icon: '🏢',
    },
    {
        title: 'Cumplimiento HIPAA',
        description: 'Privacidad y seguridad de datos garantizadas conforme a estándares internacionales.',
        icon: '🔒',
    },
    {
        title: 'Multi-tenant',
        description: 'Soporta profesionales independientes y organizaciones en la misma plataforma.',
        icon: '🔗',
    },
    {
        title: 'Interoperabilidad FHIR',
        description: 'Estándares abiertos para integración con otros sistemas de salud.',
        icon: '📡',
    },
];

export default function HomePage() {
    const { user } = useUser();
    const roles = extractRoles(user);
    const isLoggedIn = Boolean(user);

    return (
        <main className="min-h-screen bg-slate-950 text-white">
            {/* Hero Section */}
            <section className="relative overflow-hidden pt-32 pb-20">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.22),transparent_32%),radial-gradient(circle_at_80%_20%,rgba(132,204,22,0.18),transparent_24%),linear-gradient(180deg,#020617_0%,#0f172a_100%)]" />
                <div className="relative mx-auto max-w-6xl px-6">
                    <div className="max-w-3xl">
                        <p className="text-sm font-medium uppercase tracking-[0.28em] text-sky-300">
                            Plataforma de Salud Moderna
                        </p>
                        <h1 className="mt-6 text-6xl font-bold tracking-tight text-white sm:text-7xl">
                            Historia clínica electrónica inteligente para todos.
                        </h1>
                        <p className="mt-6 max-w-2xl text-xl leading-8 text-slate-300">
                            Conecta pacientes, profesionales y organizaciones en una plataforma segura,
                            cumpliendo HIPAA y estándares internacionales de salud digital.
                        </p>

                        {/* Primary CTAs */}
                        <div className="mt-10 flex flex-wrap gap-4">
                            <Link
                                href={user ? '/dashboard' : '/login'}
                                className="px-8 py-4 rounded-lg bg-sky-500 hover:bg-sky-600 text-white font-semibold transition"
                            >
                                {user ? 'Ir a mi dashboard' : 'Ingresar'}
                            </Link>
                            <Link
                                href="/#portals"
                                className="px-8 py-4 rounded-lg border border-white/20 hover:border-white/40 text-white font-semibold transition"
                            >
                                Conocer Portales
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-20 bg-slate-900/50 border-y border-white/10">
                <div className="mx-auto max-w-6xl px-6">
                    <div className="max-w-2xl mb-16">
                        <h2 className="text-4xl font-bold text-white">Características</h2>
                        <p className="mt-4 text-lg text-slate-300">
                            Una plataforma completa diseñada para los tres actores principales del sistema de salud.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {features.map((feature, idx) => (
                            <div key={idx} className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur hover:bg-white/10 transition">
                                <div className="text-4xl mb-4">{feature.icon}</div>
                                <h3 className="text-xl font-semibold text-white">{feature.title}</h3>
                                <p className="mt-3 text-slate-300">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Portals Section */}
            <section id="portals" className="py-20">
                <div className="mx-auto max-w-6xl px-6">
                    <div className="max-w-2xl mb-16">
                        <h2 className="text-4xl font-bold text-white">Portales Disponibles</h2>
                        <p className="mt-4 text-lg text-slate-300">
                            Accede al portal que corresponde a tu rol en el sistema de salud.
                        </p>
                    </div>

                    <div className="grid gap-6 md:grid-cols-3">
                        {LANDING_PORTALS.map((portal) => {
                            const accessState = getPortalAccessState(portal.id, isLoggedIn, roles);
                            return (
                                <div
                                    key={portal.href}
                                    className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur flex flex-col hover:bg-white/10 transition"
                                >
                                    <div className={`h-2 w-24 rounded-full bg-gradient-to-r ${portal.accent}`} />
                                    <h3 className="mt-6 text-2xl font-semibold text-white">
                                        {portal.title}
                                    </h3>
                                    <p className="mt-4 text-slate-300 flex-1">
                                        {portal.description}
                                    </p>

                                    {accessState.showLoginCta && (
                                        <div className="mt-8">
                                            <Link
                                                href="/login"
                                                className={`inline-flex rounded-lg px-4 py-2 text-sm font-medium text-white ${portal.id === 'organization' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}
                                            >
                                                Ingresar
                                            </Link>
                                        </div>
                                    )}

                                    {accessState.showLinks && (
                                        <ul className="mt-8 space-y-3">
                                            {portal.links.map((link) => (
                                                <li key={link.href}>
                                                    <Link
                                                        href={link.href}
                                                        className="flex items-center gap-2 text-sm text-sky-300 hover:text-sky-200 transition"
                                                    >
                                                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                                        {link.label}
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
                                    )}

                                    {accessState.accessDenied && (
                                        <p className="mt-8 text-sm text-slate-300">
                                            Tenés sesión activa, pero tu rol actual no habilita este portal.
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Demo Links */}
            <section className="py-16 bg-slate-900/30 border-t border-white/10">
                <div className="mx-auto max-w-6xl px-6">
                    <div className="grid md:grid-cols-2 gap-12 items-start">
                        {/* Public portals */}
                        <div>
                            <h3 className="text-2xl font-semibold text-white mb-3">Portales Públicos</h3>
                            <p className="text-slate-400 mb-6 text-sm">
                                Páginas públicas de profesionales e instituciones — sin login requerido.
                            </p>
                            <div className="flex flex-col gap-4">
                                <Link
                                    href="/booking/drfulano"
                                    className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 p-5 transition"
                                >
                                    <h4 className="text-base font-semibold text-emerald-300">Profesional Independiente</h4>
                                    <p className="mt-1 text-sm text-slate-300">Dr. Juan Fulano — Clínica Médica</p>
                                    <p className="mt-2 text-xs text-slate-500">/booking/drfulano</p>
                                </Link>
                                <Link
                                    href="/org/clinica-demo"
                                    className="rounded-xl border border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 p-5 transition"
                                >
                                    <h4 className="text-base font-semibold text-orange-300">Organización</h4>
                                    <p className="mt-1 text-sm text-slate-300">Clínica Demo Multiespecialidad</p>
                                    <p className="mt-2 text-xs text-slate-500">/org/clinica-demo</p>
                                </Link>
                            </div>
                        </div>

                        {/* Full system demo */}
                        <div>
                            <h3 className="text-2xl font-semibold text-white mb-3">Probar la Plataforma</h3>
                            <p className="text-slate-400 mb-6 text-sm">
                                Explorá los paneles internos con usuarios de demostración — paciente, profesional y administrador.
                            </p>
                            <Link
                                href="/demo"
                                className="group block rounded-xl border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 p-6 transition"
                            >
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-sky-500 to-emerald-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                        ▶
                                    </div>
                                    <div>
                                        <h4 className="text-base font-semibold text-sky-300">Acceso Demo Completo</h4>
                                        <p className="text-xs text-slate-400">3 roles disponibles</p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2 mb-4">
                                    <span className="text-xs rounded-full bg-sky-500/20 text-sky-300 px-2.5 py-0.5">Paciente</span>
                                    <span className="text-xs rounded-full bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5">Profesional</span>
                                    <span className="text-xs rounded-full bg-orange-500/20 text-orange-300 px-2.5 py-0.5">Org Admin</span>
                                </div>
                                <span className="text-sm text-sky-400 group-hover:text-sky-300 transition font-medium">
                                    Ingresar al modo demo →
                                </span>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
            {/* Footer */}
            <footer className="border-t border-white/10 py-8 px-6 bg-slate-950">
                <div className="mx-auto max-w-6xl text-center text-sm text-slate-500">
                    <p>© 2026 HEED. Plataforma de Historia Clínica Inteligente.</p>
                </div>
            </footer>
        </main>
    );
}