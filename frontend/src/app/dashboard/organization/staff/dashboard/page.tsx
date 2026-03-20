/**
 * Dashboard for a professional who is part of an organization (OrgStaff role).
 * This is a scoped view: they only see their own agenda and assigned patients.
 */
export default function OrgStaffDashboardPage() {
    return (
        <main className="min-h-screen bg-slate-50 py-10 px-4">
            <div className="max-w-4xl mx-auto space-y-8">
                <header>
                    <h1 className="text-3xl font-bold text-slate-900">Mi Dashboard</h1>
                    <p className="text-slate-500 mt-1">Tu agenda y pacientes dentro de la organización</p>
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
                            className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:border-indigo-300 hover:shadow-md transition-all"
                        >
                            <div className="text-3xl mb-2">{item.icon}</div>
                            <h2 className="font-semibold text-slate-800">{item.label}</h2>
                            <p className="text-sm text-slate-500 mt-1">{item.desc}</p>
                        </a>
                    ))}
                </div>

                {/* Today's appointments summary */}
                <section className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                    <h2 className="font-semibold text-slate-800 mb-4">Turnos de hoy</h2>
                    <div className="rounded-lg border-2 border-dashed border-slate-200 p-8 text-center text-slate-400 text-sm">
                        Próximas consultas del día — próximamente
                    </div>
                </section>
            </div>
        </main>
    );
}
