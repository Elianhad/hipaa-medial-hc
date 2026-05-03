export default function OrgStaffPacientesPage() {
    return (
        <main className="min-h-screen py-10 px-4">
            <div className="max-w-5xl mx-auto space-y-6">
                <header className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm sm:p-8">
                    <div>
                        <a
                            href="/dashboard/organization/staff/dashboard"
                            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                        >
                            ← Dashboard
                        </a>
                        <h1 className="mt-3 text-3xl font-bold text-slate-900">Mis Pacientes</h1>
                        <p className="mt-2 text-slate-600">Pacientes que te fueron asignados en la organización</p>
                        <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">Cupo asignado</span>
                            <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-violet-700">Historia clínica</span>
                        </div>
                    </div>
                </header>

                <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-white/90 shadow-sm">
                    <table className="w-full text-sm">
                        <thead className="border-b border-emerald-100 bg-emerald-50/70">
                            <tr>
                                <th className="text-left px-6 py-3 font-medium text-slate-600">Paciente</th>
                                <th className="text-left px-6 py-3 font-medium text-slate-600">DNI</th>
                                <th className="text-left px-6 py-3 font-medium text-slate-600">Último turno</th>
                                <th className="px-6 py-3" />
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-emerald-700">
                                    Cargando pacientes…
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </section>
            </div>
        </main>
    );
}
