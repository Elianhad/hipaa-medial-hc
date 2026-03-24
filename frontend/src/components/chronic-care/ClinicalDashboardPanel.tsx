'use client';

import { useEffect, useMemo, useState } from 'react';
import { getEvolutionsByPatient, type PatientEvolution, type PatientProblem } from '@/lib/clinical-problems-api';
import {
    buildDashboardSelectionState,
    latestTrendByProblem,
    resolveSelectedProblemId,
    toTrendIndicator,
    type DashboardEvolution,
} from '@/lib/clinical-dashboard-utils';

interface ClinicalEvolutionItem extends DashboardEvolution, PatientEvolution { }

interface Props {
    patientId: string;
    problems: PatientProblem[];
}

export default function ClinicalDashboardPanel({ patientId, problems }: Props) {
    const [evolutions, setEvolutions] = useState<ClinicalEvolutionItem[]>([]);
    const [loadingEvolutions, setLoadingEvolutions] = useState(false);
    const [selectedProblemId, setSelectedProblemId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const activeProblems = useMemo(
        () => problems.filter((problem) => problem.clinicalStatus === 'active' && problem.status !== 'resolved'),
        [problems],
    );

    useEffect(() => {
        const resolved = resolveSelectedProblemId(activeProblems, selectedProblemId);
        if (resolved !== selectedProblemId) {
            setSelectedProblemId(resolved);
        }
    }, [activeProblems, selectedProblemId]);

    useEffect(() => {
        if (!patientId) return;

        const loadEvolutions = async () => {
            setLoadingEvolutions(true);
            setError(null);

            try {
                const data = await getEvolutionsByPatient(patientId);
                setEvolutions(data as ClinicalEvolutionItem[]);
            } catch (err: any) {
                setError(err?.message ?? 'No se pudo cargar el historial clínico.');
            } finally {
                setLoadingEvolutions(false);
            }
        };

        void loadEvolutions();
    }, [patientId, problems]);

    const trendMap = useMemo(() => latestTrendByProblem(evolutions), [evolutions]);

    const selectedProblem = useMemo(
        () => activeProblems.find((problem) => problem.id === selectedProblemId) ?? null,
        [activeProblems, selectedProblemId],
    );

    const filteredEvolutions = useMemo(() => {
        const state = buildDashboardSelectionState(evolutions, activeProblems, selectedProblemId);
        return state.evolutions;
    }, [evolutions, activeProblems, selectedProblemId]);

    return (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <header className="mb-4">
                <h2 className="text-xl font-semibold text-slate-900">Dashboard Clínico</h2>
                <p className="text-sm text-slate-600">
                    Selecciona un problema activo para ver su evolución cronológica sin perder el hilo clínico.
                </p>
            </header>

            <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
                <aside className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <h3 className="text-sm font-semibold text-slate-800 mb-2">Problemas activos</h3>
                    {activeProblems.length === 0 && (
                        <p className="text-sm text-slate-500">No hay problemas activos para mostrar.</p>
                    )}

                    {activeProblems.length > 0 && (
                        <ul className="space-y-2">
                            {activeProblems.map((problem) => {
                                const trend = trendMap[problem.id] ?? null;
                                const indicator = toTrendIndicator(trend);
                                const isSelected = selectedProblemId === problem.id;

                                return (
                                    <li key={problem.id}>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedProblemId(problem.id)}
                                            className={`w-full rounded-md border p-3 text-left transition ${isSelected
                                                ? 'border-indigo-300 bg-indigo-50'
                                                : 'border-slate-200 bg-white hover:border-slate-300'
                                                }`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-900">{problem.title}</p>
                                                    <p className="text-[11px] text-slate-500">{problem.id}</p>
                                                </div>
                                                <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${indicator.className}`}>
                                                    {indicator.label}
                                                </span>
                                            </div>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </aside>

                <div className="rounded-lg border border-slate-200 p-4">
                    <h3 className="text-sm font-semibold text-slate-800 mb-3">
                        Historial cronológico {selectedProblem ? `· ${selectedProblem.title}` : ''}
                    </h3>

                    {loadingEvolutions && <p className="text-sm text-slate-500">Cargando evoluciones...</p>}
                    {error && <p className="text-sm text-rose-600">{error}</p>}
                    {!loadingEvolutions && !error && !selectedProblem && (
                        <p className="text-sm text-slate-500">Selecciona un problema activo para ver su historial.</p>
                    )}

                    {!loadingEvolutions && !error && selectedProblem && filteredEvolutions.length === 0 && (
                        <p className="text-sm text-slate-500">No hay evoluciones registradas para este problema.</p>
                    )}

                    {!loadingEvolutions && !error && filteredEvolutions.length > 0 && (
                        <ul className="space-y-3">
                            {filteredEvolutions.map((evolution) => (
                                <li key={evolution.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                                    <div className="mb-2 flex items-center justify-between gap-3">
                                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                                            {evolution.evolutionDate} · {String(evolution.evolutionTime).slice(0, 5)}
                                        </span>
                                        {evolution.trend && (
                                            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${toTrendIndicator(evolution.trend).className}`}>
                                                {toTrendIndicator(evolution.trend).label}
                                            </span>
                                        )}
                                    </div>

                                    <div className="space-y-2 text-sm text-slate-700">
                                        {evolution.subjective && (
                                            <p>
                                                <span className="font-semibold text-slate-900">MC + EA: </span>
                                                {evolution.subjective}
                                            </p>
                                        )}
                                        {evolution.objective && (
                                            <p>
                                                <span className="font-semibold text-slate-900">Objetivo: </span>
                                                {evolution.objective}
                                            </p>
                                        )}
                                        {evolution.assessment && (
                                            <p>
                                                <span className="font-semibold text-slate-900">Apreciación: </span>
                                                {evolution.assessment}
                                            </p>
                                        )}
                                        {evolution.plan && (
                                            <p>
                                                <span className="font-semibold text-slate-900">Plan: </span>
                                                {evolution.plan}
                                            </p>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </section>
    );
}
