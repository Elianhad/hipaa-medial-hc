export default function ProfessionalPacientesPage() {
    return (
        <main className="min-h-screen bg-slate-50 py-10 px-4">
            <div className="max-w-5xl mx-auto space-y-6">
                <header className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Pacientes</h1>
                        <p className="text-slate-500 mt-1">Listado de pacientes con historia clínica</p>
                    </div>
                    <a
                        href="/dashboard/professional"
                        className="text-sm text-indigo-600 hover:underline"
                    >
                        ← Dashboard
                    </a>
                </header>

                <section className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                    {/* TODO: fetch from GET /v1/patients with tenant scope */}
                    <div className="rounded-lg border-2 border-dashed border-slate-200 p-12 text-center text-slate-400 text-sm">
                        Listado de pacientes — próximamente
                    </div>
                </section>
            </div>
        </main>
    );
}
