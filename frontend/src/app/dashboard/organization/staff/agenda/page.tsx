export default function OrgStaffAgendaPage() {
    return (
        <main className="min-h-screen bg-slate-50 py-10 px-4">
            <div className="max-w-5xl mx-auto space-y-6">
                <header className="flex items-center gap-4">
                    <a href="/dashboard/organization/staff/dashboard" className="text-slate-400 hover:text-slate-600 text-sm">
                        ← Dashboard
                    </a>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Mi Agenda</h1>
                        <p className="text-slate-500 mt-1">Tus turnos dentro de la organización</p>
                    </div>
                </header>

                <section className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                    <div className="rounded-lg border-2 border-dashed border-slate-200 p-12 text-center text-slate-400 text-sm">
                        Calendario de turnos — próximamente
                    </div>
                </section>
            </div>
        </main>
    );
}
