"use client";

import Link from 'next/link';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import PatientProblemsPanel from '@/components/chronic-care/PatientProblemsPanel';
import ClinicalDashboardPanel from '@/components/chronic-care/ClinicalDashboardPanel';
import type { PatientProblem } from '@/lib/clinical-problems-api';
import { ArrowLeftIcon, FileTextIcon } from 'lucide-react';

/**
 * /dashboard/professional/pacientes/[id]
 *
 * Clinical record view + new SOAP evolution for a specific patient.
 */
export default function ProfessionalPatientDetailPage() {
    const routeParams = useParams<{ id: string }>();
    const routeId = routeParams?.id ?? '';
    const [problems, setProblems] = useState<PatientProblem[]>([]);

    return (
        <main className="min-h-screen py-8 px-4 sm:py-10">
            <div className="mx-auto max-w-5xl space-y-8">
                <header className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm sm:p-8">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-2xl">
                            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Panel clinico diario</p>
                            <h1 className="mt-3 text-[clamp(2rem,4vw,2.75rem)] font-bold leading-tight text-slate-900">Historia Clinica</h1>
                            <p className="mt-2 text-slate-600">
                                Registro de evolucion, problemas activos y seguimiento longitudinal del paciente.
                            </p>
                            <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
                                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">Paciente: {routeId}</span>
                                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">Evolucion clinica</span>
                                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">Problemas activos</span>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                            <Link
                                href="/dashboard/professional/pacientes"
                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-400"
                            >
                                <ArrowLeftIcon className="h-4 w-4" /> Volver a pacientes
                            </Link>
                            <Link
                                href={`/dashboard/professional/pacientes/${routeId}/receta`}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                            >
                                <FileTextIcon className="h-4 w-4" /> Receta digital y firma
                            </Link>
                        </div>
                    </div>
                </header>

                <ClinicalDashboardPanel patientId={routeId} problems={problems} />

                <PatientProblemsPanel patientId={routeId} onProblemsChanged={setProblems} />

                <footer className="border-t border-slate-200 pt-6 text-sm text-slate-500">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p>HEED · Portal del Profesional</p>
                        <p>Historia clinica, evolucion y continuidad asistencial</p>
                    </div>
                </footer>
            </div>
        </main>
    );
}
