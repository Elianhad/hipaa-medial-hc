import { use } from 'react';
import Link from 'next/link';
import PrescriptionSignatureFlow from '@/components/chronic-care/PrescriptionSignatureFlow';
import { ArrowLeftIcon, StethoscopeIcon } from 'lucide-react';

export default function ProfessionalPatientPrescriptionPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);

    return (
        <main className="min-h-screen py-8 px-4 sm:py-10">
            <div className="mx-auto max-w-5xl space-y-8">
                <header className="rounded-3xl border border-slate-200 bg-[linear-gradient(120deg,rgba(236,253,245,0.7)_0%,rgba(255,255,255,0.95)_45%,rgba(239,246,255,0.7)_100%)] p-6 shadow-sm sm:p-8">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-2xl">
                            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Panel clinico diario</p>
                            <h1 className="mt-3 text-[clamp(2rem,4vw,2.75rem)] font-bold leading-tight text-slate-900">Receta Digital y Firma</h1>
                            <p className="mt-2 text-slate-600">Paciente: {id} · Emision de receta, firma digital y validacion normativa AR.</p>
                            <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
                                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">Ley 25.649</span>
                                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-700">Ley 25.506</span>
                                <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sky-700">Paciente: {id}</span>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-3 lg:justify-end">
                            <Link
                                href={`/dashboard/professional/pacientes/${id}`}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 hover:border-emerald-400"
                            >
                                <ArrowLeftIcon className="h-4 w-4" /> Volver a historia clinica
                            </Link>
                            <Link
                                href="/dashboard/professional"
                                className="inline-flex items-center gap-1.5 rounded-xl border border-sky-300 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-800 hover:border-sky-400"
                            >
                                <StethoscopeIcon className="h-4 w-4" /> Portal profesional
                            </Link>
                        </div>
                    </div>
                </header>

                <PrescriptionSignatureFlow patientId={id} professionalId="" />

                <footer className="border-t border-slate-200 pt-6 text-sm text-slate-500">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p>HEED · Portal del Profesional</p>
                        <p>Prescripcion digital, firma e integridad del hilo clinico</p>
                    </div>
                </footer>
            </div>
        </main>
    );
}
