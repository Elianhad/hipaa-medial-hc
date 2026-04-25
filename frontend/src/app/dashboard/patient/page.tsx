import { PatientRegistrationForm } from '../../../components/forms/PatientRegistrationForm';

export default function PatientDashboardPage() {
  return (
    <main className="min-h-screen py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm sm:p-8">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Panel del paciente</p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">Portal del Paciente</h1>
          <p className="mt-2 text-slate-600">
            Gestión de datos de afiliación e historia clínica consolidada
          </p>
        </header>

        <PatientRegistrationForm />
      </div>
    </main>
  );
}
