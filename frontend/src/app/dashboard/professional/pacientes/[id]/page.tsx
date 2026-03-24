"use client";

import { useState } from 'react';
import { useParams } from 'next/navigation';
import PatientProblemsPanel from '@/components/chronic-care/PatientProblemsPanel';
import ClinicalDashboardPanel from '@/components/chronic-care/ClinicalDashboardPanel';
import type { PatientProblem } from '@/lib/clinical-problems-api';

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
        <main className="min-h-screen bg-slate-50 py-10 px-4">
            <div className="max-w-4xl mx-auto space-y-8">
                <header className="flex items-center gap-4">
                    <a href="/dashboard/professional/pacientes" className="text-slate-400 hover:text-slate-600 text-sm">
                        ← Pacientes
                    </a>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Historia Clínica</h1>
                        <p className="text-slate-500 text-sm font-mono">Paciente: {routeId}</p>
                    </div>
                    <a
                        href={`/dashboard/professional/pacientes/${routeId}/receta`}
                        className="ml-auto rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                    >
                        Receta digital y firma
                    </a>
                </header>

                <ClinicalDashboardPanel patientId={routeId} problems={problems} />

                <PatientProblemsPanel patientId={routeId} onProblemsChanged={setProblems} />
            </div>
        </main>
    );
}
