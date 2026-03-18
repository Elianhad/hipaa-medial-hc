import { SoapEvolutionForm } from '../../../components/forms/SoapEvolutionForm';

export default function ProfessionalDashboardPage() {
  // In production these would come from session / URL params
  const DEMO_PATIENT_ID = 'a3b8c12d-5678-4ef1-9012-3456789abcde';
  const DEMO_PROF_ID = 'prof-uuid-0001-aaaa-000000000000';

  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <header>
          <h1 className="text-3xl font-bold text-slate-900">
            Portal del Profesional
          </h1>
          <p className="mt-1 text-slate-500">
            Historia Clínica Orientada a Problemas (HCOP)
          </p>
        </header>

        <SoapEvolutionForm
          patientId={DEMO_PATIENT_ID}
          professionalId={DEMO_PROF_ID}
          problems={[
            {
              id: 'existing-problem-fhir-id-abc123',
              title: 'Neumonías recurrentes',
            },
            {
              id: 'problem-uuid-2',
              title: 'HTA — Hipertensión arterial',
            },
          ]}
        />
      </div>
    </main>
  );
}
