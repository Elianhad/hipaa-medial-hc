export default function OrgAgendaPage() {
    return (
        <main className="min-h-screen bg-slate-50 py-10 px-4">
            <div className="max-w-6xl mx-auto space-y-6">
                <header>
                    <h1 className="text-3xl font-bold text-slate-900">Agenda Organizacional</h1>
                    <p className="text-slate-500 mt-1">Vista multiusuario de turnos de todos los profesionales</p>
                </header>

                {/* Professional filter */}
                <div className="flex gap-3 flex-wrap">
                    <span className="text-sm text-slate-500 self-center mr-2">Filtrar por:</span>
                    {['Todos', 'Clínica', 'Cardiología', 'Pediatría'].map((f) => (
                        <button
                            key={f}
                            type="button"
                            className="px-3 py-1.5 rounded-full text-sm border border-slate-200 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
                        >
                            {f}
                        </button>
                    ))}
                </div>

                <section className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                    {/* TODO: multi-resource calendar (react-big-calendar with resourceId) */}
                    <div className="rounded-lg border-2 border-dashed border-slate-200 p-12 text-center text-slate-400 text-sm">
                        Calendario multi-profesional — próximamente
                    </div>
                </section>
            </div>
        </main>
    );
}
