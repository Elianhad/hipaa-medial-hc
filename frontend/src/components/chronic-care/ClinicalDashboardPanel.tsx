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

    const selectedTrend = selectedProblem ? toTrendIndicator(trendMap[selectedProblem.id] ?? null) : null;

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <header className="mb-5 px-1">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Continuidad asistencial</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">Panel de Evolución Clínica</h2>
                <p className="mt-1 text-sm text-slate-600">
                    Selecciona un problema activo para revisar su evolución cronológica sin perder el contexto clínico.
                </p>
            </header>

            <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-3 sm:p-4 lg:grid-cols-[320px_1fr] lg:gap-5">
                <aside className="rounded-xl bg-white/70 p-4">
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-slate-800">Problemas activos</h3>
                        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
                            {activeProblems.length}
                        </span>
                    </div>
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
                                            className={`w-full rounded-xl border p-3 text-left transition ${isSelected
                                                ? 'border-slate-300 bg-white shadow-sm'
                                                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
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

                <div className="rounded-xl bg-white p-4 sm:p-5">
                    <div className="mb-4 flex flex-col gap-2 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
                        <h3 className="text-base font-semibold text-slate-900">
                            Registro cronológico {selectedProblem ? `· ${selectedProblem.title}` : ''}
                        </h3>
                        {selectedTrend && (
                            <span className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${selectedTrend.className}`}>
                                {selectedTrend.label}
                            </span>
                        )}
                    </div>

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
                                <li key={evolution.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
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
