export default function OrgStaffAgendaPage() {
    return (
        <main className="min-h-screen py-10 px-4">
            <div className="max-w-5xl mx-auto space-y-6">
                <header className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm sm:p-8">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <a
                                href="/dashboard/organization/staff/dashboard"
                                className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                            >
                                ← Dashboard
                            </a>
                            <h1 className="mt-3 text-3xl font-bold text-slate-900">Mi Agenda</h1>
                            <p className="mt-2 text-slate-600">Tus turnos dentro de la organización</p>
                            <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
                                <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sky-700">Citas del día</span>
                                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">Seguimiento asistencial</span>
                            </div>
                        </div>
                    </div>
                </header>

                <section className="rounded-2xl border border-sky-200 bg-white/90 p-6 shadow-sm">
                    <div className="rounded-xl border-2 border-dashed border-sky-200 bg-sky-50/40 p-12 text-center text-sm text-sky-700">
                        Calendario de turnos — próximamente
                    </div>
                </section>
            </div>
        </main>
    );
}
