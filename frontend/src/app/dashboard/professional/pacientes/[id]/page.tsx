import { use } from 'react';
import { SoapEvolutionForm } from '../../../../../components/forms/SoapEvolutionForm';

/**
 * /dashboard/professional/pacientes/[id]
 *
 * Clinical record view + new SOAP evolution for a specific patient.
 */
export default function ProfessionalPatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    // TODO: derive real professionalId from session
    const DEMO_PROF_ID = 'prof-uuid-0001-aaaa-000000000000';

    return (
        <main className="min-h-screen bg-slate-50 py-10 px-4">
            <div className="max-w-4xl mx-auto space-y-8">
                <header className="flex items-center gap-4">
                    <a href="/dashboard/professional/pacientes" className="text-slate-400 hover:text-slate-600 text-sm">
                        ← Pacientes
                    </a>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Historia Clínica</h1>
                        <p className="text-slate-500 text-sm font-mono">Paciente: {id}</p>
                    </div>
                </header>

                {/* Past evolutions */}
                <section className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                    <h2 className="font-semibold text-slate-800 mb-4">Evoluciones previas</h2>
                    <div className="rounded-lg border-2 border-dashed border-slate-200 p-8 text-center text-slate-400 text-sm">
                        Historial de evoluciones — próximamente
                    </div>
                </section>

                {/* New evolution */}
                <section>
                    <h2 className="font-semibold text-slate-800 mb-4">Nueva evolución SOAP</h2>
                    <SoapEvolutionForm
                        patientId={id}
                        professionalId={DEMO_PROF_ID}
                        problems={[]}
                    />
                </section>
            </div>
        </main>
    );
}
