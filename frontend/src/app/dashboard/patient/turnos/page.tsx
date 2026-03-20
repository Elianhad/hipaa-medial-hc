export default function PatientAppointmentsPage() {
    return (
        <main className="min-h-screen bg-slate-50 py-10 px-4">
            <div className="max-w-4xl mx-auto space-y-6">
                <header>
                    <h1 className="text-3xl font-bold text-slate-900">Mis Turnos</h1>
                    <p className="text-slate-500 mt-1">Próximas consultas y historial de turnos</p>
                </header>

                {/* Upcoming */}
                <section className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                    <h2 className="font-semibold text-slate-800 mb-4">Próximos turnos</h2>
                    <div className="rounded-lg border-2 border-dashed border-slate-200 p-8 text-center text-slate-400 text-sm">
                        Turnos próximos — próximamente
                    </div>
                </section>

                {/* Past */}
                <section className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                    <h2 className="font-semibold text-slate-800 mb-4">Turnos anteriores</h2>
                    <div className="rounded-lg border-2 border-dashed border-slate-200 p-8 text-center text-slate-400 text-sm">
                        Historial de turnos — próximamente
                    </div>
                </section>
            </div>
        </main>
    );
}
