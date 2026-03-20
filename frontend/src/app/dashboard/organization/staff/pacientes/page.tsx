export default function OrgStaffPacientesPage() {
    return (
        <main className="min-h-screen bg-slate-50 py-10 px-4">
            <div className="max-w-5xl mx-auto space-y-6">
                <header className="flex items-center gap-4">
                    <a href="/dashboard/organization/staff/dashboard" className="text-slate-400 hover:text-slate-600 text-sm">
                        ← Dashboard
                    </a>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Mis Pacientes</h1>
                        <p className="text-slate-500 mt-1">Pacientes que te fueron asignados en la organización</p>
                    </div>
                </header>

                <section className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="text-left px-6 py-3 font-medium text-slate-600">Paciente</th>
                                <th className="text-left px-6 py-3 font-medium text-slate-600">DNI</th>
                                <th className="text-left px-6 py-3 font-medium text-slate-600">Último turno</th>
                                <th className="px-6 py-3" />
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
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
