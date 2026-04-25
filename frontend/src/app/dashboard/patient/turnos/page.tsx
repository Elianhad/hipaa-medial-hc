export default function PatientAppointmentsPage() {
    return (
        <main className="min-h-screen py-10 px-4">
            <div className="max-w-4xl mx-auto space-y-6">
                <header>
                    <h1 className="text-3xl font-bold text-slate-900">Mis Turnos</h1>
                    <p className="text-slate-500 mt-1">Próximas consultas y historial de turnos</p>
                </header>

                {/* Upcoming */}
                <section className="rounded-xl border border-sky-200 bg-sky-50/70 p-6 shadow-sm">
                    <h2 className="mb-4 font-semibold text-sky-900">Próximos turnos</h2>
                    <div className="rounded-lg border-2 border-dashed border-slate-200 p-8 text-center text-slate-400 text-sm">
                        Turnos próximos — próximamente
                    </div>
                </section>

                {/* Past */}
                <section className="rounded-xl border border-violet-200 bg-violet-50/60 p-6 shadow-sm">
                    <h2 className="mb-4 font-semibold text-violet-900">Turnos anteriores</h2>
                    <div className="rounded-lg border-2 border-dashed border-slate-200 p-8 text-center text-slate-400 text-sm">
                        Historial de turnos — próximamente
                    </div>
                </section>
            </div>
        </main>
    );
}
