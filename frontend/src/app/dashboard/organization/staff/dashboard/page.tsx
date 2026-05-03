/**
 * Dashboard for a professional who is part of an organization (OrgStaff role).
 * This is a scoped view: they only see their own agenda and assigned patients.
 */
export default function OrgStaffDashboardPage() {
    return (
        <main className="min-h-screen py-10 px-4">
            <div className="max-w-4xl mx-auto space-y-8">
                <header className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm sm:p-8">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Portal staff</p>
                    <h1 className="mt-3 text-3xl font-bold text-slate-900">Mi Dashboard</h1>
                    <p className="mt-2 text-slate-600">Tu agenda y pacientes dentro de la organización</p>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
                        <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sky-700">Operativa personal</span>
                        <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-violet-700">Seguimiento clínico</span>
                    </div>
                </header>

                {/* Quick links */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                        { label: 'Mi Agenda', href: '/dashboard/organization/staff/agenda', icon: '📅', desc: 'Turnos del día y semana' },
                        { label: 'Mis Pacientes', href: '/dashboard/organization/staff/pacientes', icon: '🧑‍⚕️', desc: 'Historia clínica de tus pacientes' },
                    ].map((item) => (
                        <a
                            key={item.label}
                            href={item.href}
                            className="rounded-2xl border border-sky-200 bg-white/90 p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md"
                        >
                            <div className="text-3xl mb-2">{item.icon}</div>
                            <h2 className="font-semibold text-slate-900">{item.label}</h2>
                            <p className="text-sm text-slate-500 mt-1">{item.desc}</p>
                        </a>
                    ))}
                </div>

                {/* Today's appointments summary */}
                <section className="rounded-2xl border border-emerald-200 bg-white/90 p-6 shadow-sm">
                    <h2 className="mb-4 font-semibold text-slate-900">Turnos de hoy</h2>
                    <div className="rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50/40 p-8 text-center text-sm text-emerald-700">
                        Próximas consultas del día — próximamente
                    </div>
                </section>
            </div>
        </main>
    );
}
