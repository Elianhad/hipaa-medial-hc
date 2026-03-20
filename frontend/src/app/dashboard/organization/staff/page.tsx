export default function OrgStaffPage() {
    return (
        <main className="min-h-screen bg-slate-50 py-10 px-4">
            <div className="max-w-5xl mx-auto space-y-6">
                <header className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Gestión de Staff</h1>
                        <p className="text-slate-500 mt-1">Profesionales que forman parte de la organización</p>
                    </div>
                    <button
                        type="button"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                    >
                        + Agregar profesional
                    </button>
                </header>

                <section className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="text-left px-6 py-3 font-medium text-slate-600">Profesional</th>
                                <th className="text-left px-6 py-3 font-medium text-slate-600">Especialidad</th>
                                <th className="text-left px-6 py-3 font-medium text-slate-600">Rol</th>
                                <th className="text-left px-6 py-3 font-medium text-slate-600">Estado</th>
                                <th className="px-6 py-3" />
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                    Cargando staff de la organización…
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </section>
            </div>
        </main>
    );
}
