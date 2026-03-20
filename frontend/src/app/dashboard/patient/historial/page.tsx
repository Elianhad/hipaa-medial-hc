export default function PatientHistorialPage() {
    return (
        <main className="min-h-screen bg-slate-50 py-10 px-4">
            <div className="max-w-4xl mx-auto space-y-6">
                <header>
                    <h1 className="text-3xl font-bold text-slate-900">Mi Historia Clínica</h1>
                    <p className="text-slate-500 mt-1">Consultas, evoluciones y estudios (solo lectura)</p>
                </header>

                <section className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                    <h2 className="font-semibold text-slate-800 mb-4">Problemas activos</h2>
                    <div className="rounded-lg border-2 border-dashed border-slate-200 p-8 text-center text-slate-400 text-sm">
                        Lista de problemas — próximamente
                    </div>
                </section>

                <section className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                    <h2 className="font-semibold text-slate-800 mb-4">Evoluciones clínicas</h2>
                    <div className="rounded-lg border-2 border-dashed border-slate-200 p-8 text-center text-slate-400 text-sm">
                        Registro SOAP de consultas — próximamente
                    </div>
                </section>
            </div>
        </main>
    );
}
