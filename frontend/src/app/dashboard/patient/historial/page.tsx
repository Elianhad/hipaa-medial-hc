export default function PatientHistorialPage() {
    return (
        <main className="min-h-screen py-10 px-4">
            <div className="max-w-4xl mx-auto space-y-6">
                <header>
                    <h1 className="text-3xl font-bold text-slate-900">Mi Historia Clínica</h1>
                    <p className="text-slate-500 mt-1">Consultas, evoluciones y estudios (solo lectura)</p>
                </header>

                <section className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-6 shadow-sm">
                    <h2 className="mb-4 font-semibold text-emerald-900">Problemas activos</h2>
                    <div className="rounded-lg border-2 border-dashed border-slate-200 p-8 text-center text-slate-400 text-sm">
                        Lista de problemas — próximamente
                    </div>
                </section>

                <section className="rounded-xl border border-amber-200 bg-amber-50/60 p-6 shadow-sm">
                    <h2 className="mb-4 font-semibold text-amber-900">Evoluciones clínicas</h2>
                    <div className="rounded-lg border-2 border-dashed border-slate-200 p-8 text-center text-slate-400 text-sm">
                        Registro SOAP de consultas — próximamente
                    </div>
                </section>
            </div>
        </main>
    );
}
