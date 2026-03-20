export default function OrgBillingPage() {
    return (
        <main className="min-h-screen bg-slate-50 py-10 px-4">
            <div className="max-w-5xl mx-auto space-y-6">
                <header>
                    <h1 className="text-3xl font-bold text-slate-900">Facturación</h1>
                    <p className="text-slate-500 mt-1">Prestaciones, obras sociales y liquidaciones</p>
                </header>

                {/* KPI row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                        { label: 'Pendiente de cobro', value: '$0', color: 'text-amber-600' },
                        { label: 'Cobrado este mes', value: '$0', color: 'text-green-600' },
                        { label: 'Prestaciones rechazadas', value: '0', color: 'text-red-600' },
                    ].map((kpi) => (
                        <div key={kpi.label} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
                            <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
                            <p className="text-sm text-slate-500 mt-1">{kpi.label}</p>
                        </div>
                    ))}
                </div>

                <section className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                    <h2 className="font-semibold text-slate-800 mb-4">Liquidaciones</h2>
                    <div className="rounded-lg border-2 border-dashed border-slate-200 p-8 text-center text-slate-400 text-sm">
                        Módulo de facturación — próximamente
                    </div>
                </section>
            </div>
        </main>
    );
}
