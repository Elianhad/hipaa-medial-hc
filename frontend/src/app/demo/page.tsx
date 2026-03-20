'use client';

import Link from 'next/link';

const DEMO_USERS = [
    {
        role: 'patient',
        label: 'Ana García',
        subtitle: 'Paciente',
        description: 'Accedé al portal de paciente: historia clínica, turnos y registros.',
        destination: '/dashboard/patient',
        color: 'from-sky-500 to-cyan-500',
        border: 'border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20',
        badge: 'text-sky-300',
        tag: 'Paciente',
        tagColor: 'bg-sky-500/20 text-sky-300',
    },
    {
        role: 'professional',
        label: 'Dr. Juan Fulano',
        subtitle: 'Profesional — Clínica Médica',
        description: 'Gestioná tu agenda, evolucioná pacientes con SOAP y más.',
        destination: '/dashboard/professional',
        color: 'from-emerald-500 to-lime-500',
        border: 'border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20',
        badge: 'text-emerald-300',
        tag: 'Profesional',
        tagColor: 'bg-emerald-500/20 text-emerald-300',
    },
    {
        role: 'orgadmin',
        label: 'María Ortega',
        subtitle: 'Admin — Clínica Demo Multiespecialidad',
        description: 'Administrá el staff, auditá prestaciones y gestioná la organización.',
        destination: '/dashboard/organization',
        color: 'from-orange-500 to-amber-500',
        border: 'border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20',
        badge: 'text-orange-300',
        tag: 'Org Admin',
        tagColor: 'bg-orange-500/20 text-orange-300',
    },
];

export default function DemoPage() {
    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-16">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.10),transparent_40%)]" />

            <div className="relative mx-auto max-w-2xl">
                {/* Header */}
                <div className="text-center mb-12">
                    <Link href="/" className="inline-block mb-8">
                        <div className="text-2xl font-bold bg-gradient-to-r from-sky-400 to-emerald-400 bg-clip-text text-transparent">
                            HEED
                        </div>
                    </Link>
                    <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-medium text-amber-300 mb-6">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        Entorno de demostración
                    </div>
                    <h1 className="text-4xl font-bold text-white">Probar el Sistema</h1>
                    <p className="mt-4 text-slate-400 max-w-md mx-auto">
                        Navegá la plataforma con usuarios de ejemplo. Los datos son de prueba y no representan información real.
                    </p>
                </div>

                {/* Demo user cards */}
                <div className="space-y-4">
                    {DEMO_USERS.map((demo) => (
                        <a
                            key={demo.role}
                            href={`/api/demo-login?role=${demo.role}&returnTo=${encodeURIComponent(demo.destination)}`}
                            className={`group w-full rounded-2xl border p-6 flex items-center gap-5 transition ${demo.border}`}
                        >
                            {/* Avatar */}
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${demo.color} flex items-center justify-center text-white text-lg font-bold flex-shrink-0 shadow-lg`}>
                                {demo.label.charAt(0)}
                            </div>

                            {/* Info */}
                            <div className="flex-1 text-left">
                                <div className="flex items-center gap-2 mb-1">
                                    <p className={`font-semibold ${demo.badge}`}>{demo.label}</p>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${demo.tagColor}`}>
                                        {demo.tag}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400">{demo.subtitle}</p>
                                <p className="text-xs text-slate-500 mt-1">{demo.description}</p>
                            </div>

                            {/* Arrow */}
                            <svg className="w-5 h-5 text-slate-500 group-hover:text-slate-300 transition flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </a>
                    ))}
                </div>

                {/* Disclaimer */}
                <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-5 text-xs text-slate-400 space-y-1">
                    <p className="font-semibold text-slate-300 mb-2">⚠ Aviso importante</p>
                    <p>Esta sesión de demo usa cookies locales temporales (24 h) y no requiere contraseña.</p>
                    <p>No ingresés datos reales en el entorno de demostración.</p>
                    <p>Para acceso a producción con tu cuenta real, usá el <Link href="/login" className="text-sky-400 hover:text-sky-300">login con Auth0</Link>.</p>
                </div>

                {/* Footer links */}
                <div className="mt-8 flex items-center justify-center gap-6 text-sm text-slate-500">
                    <Link href="/" className="hover:text-slate-300 transition">← Inicio</Link>
                    <Link href="/login" className="hover:text-slate-300 transition">Login real →</Link>
                </div>
            </div>
        </main>
    );
}
