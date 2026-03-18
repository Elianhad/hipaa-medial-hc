export default function OrganizationDashboardPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        <header>
          <h1 className="text-3xl font-bold text-slate-900">
            Portal de la Organización
          </h1>
          <p className="mt-1 text-slate-500">
            Auditoría médica, facturación y gestión de profesionales
          </p>
        </header>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-6">
          {[
            { label: 'Profesionales activos', value: '12', icon: '👨‍⚕️' },
            { label: 'Consultas este mes', value: '438', icon: '📋' },
            { label: 'Prestaciones pendientes', value: '23', icon: '💊' },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-xl bg-white p-6 shadow flex items-center gap-4"
            >
              <span className="text-4xl">{card.icon}</span>
              <div>
                <p className="text-2xl font-bold text-slate-800">{card.value}</p>
                <p className="text-sm text-slate-500">{card.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Audit placeholder */}
        <section className="rounded-xl bg-white shadow p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">
            Dashboard de Auditoría Médica
          </h2>
          <p className="text-sm text-slate-500">
            Cruce de prestaciones HCOP vs nomencladores y obras sociales.
            Reportes de inconsistencias y control de gestión hospitalaria.
          </p>
          <div className="mt-4 rounded-md bg-slate-50 border border-dashed border-slate-300 p-8 text-center text-slate-400 text-sm">
            Charts and billing reports will render here
          </div>
        </section>
      </div>
    </main>
  );
}
