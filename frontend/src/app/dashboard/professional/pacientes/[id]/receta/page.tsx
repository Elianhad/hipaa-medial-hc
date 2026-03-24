import { use } from 'react';
import Link from 'next/link';
import PrescriptionSignatureFlow from '@/components/chronic-care/PrescriptionSignatureFlow';

export default function ProfessionalPatientPrescriptionPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);

    return (
        <main className="min-h-screen bg-slate-50 py-10 px-4">
            <div className="max-w-5xl mx-auto space-y-6">
                <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Receta Digital y Firma</h1>
                        <p className="text-slate-500 mt-1">Paciente: {id} · Flujo de emisión y firma normativa AR</p>
                    </div>
                    <div className="flex gap-3">
                        <Link href={`/dashboard/professional/pacientes/${id}`} className="text-sm text-indigo-700 hover:underline">
                            Volver a historia clínica
                        </Link>
                        <Link href="/dashboard/professional" className="text-sm text-slate-600 hover:underline">
                            Dashboard
                        </Link>
                    </div>
                </header>

                <PrescriptionSignatureFlow patientId={id} professionalId="" />
            </div>
        </main>
    );
}
