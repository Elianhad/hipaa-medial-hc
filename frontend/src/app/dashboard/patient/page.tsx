import { PatientRegistrationForm } from '../../../components/forms/PatientRegistrationForm';

export default function PatientDashboardPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <header>
          <h1 className="text-3xl font-bold text-slate-900">Portal del Paciente</h1>
          <p className="mt-1 text-slate-500">
            Gestión de datos de afiliación e historia clínica consolidada
          </p>
        </header>

        <PatientRegistrationForm />
      </div>
    </main>
  );
}
