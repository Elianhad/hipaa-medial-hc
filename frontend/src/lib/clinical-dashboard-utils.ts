export type EvolutionTrend = 'worsening' | 'stable' | 'improving' | 'resolution' | null | undefined;

export interface DashboardEvolution {
    id: string;
    problemId?: string | null;
    evolutionDate: string;
    evolutionTime: string;
    trend?: EvolutionTrend;
}

export interface TrendIndicator {
    key: 'worsening' | 'stable' | 'improving' | 'resolution' | 'none';
    label: string;
    className: string;
}

export interface DashboardProblemRef {
    id: string;
}

export interface DashboardSelectionState<T extends DashboardEvolution> {
    selectedProblemId: string | null;
    evolutions: T[];
}

function buildDateTimeKey(evolution: Pick<DashboardEvolution, 'evolutionDate' | 'evolutionTime'>): string {
    return `${evolution.evolutionDate}T${evolution.evolutionTime}`;
}

export function sortEvolutionsDesc<T extends DashboardEvolution>(evolutions: T[]): T[] {
    return [...evolutions].sort((a, b) => {
        const left = buildDateTimeKey(a);
        const right = buildDateTimeKey(b);
        return right.localeCompare(left);
    });
}

export function filterEvolutionsByProblem<T extends DashboardEvolution>(
    evolutions: T[],
    problemId?: string | null,
): T[] {
    if (!problemId) return [];
    return sortEvolutionsDesc(evolutions.filter((evolution) => evolution.problemId === problemId));
}

export function resolveSelectedProblemId(
    activeProblems: DashboardProblemRef[],
    selectedProblemId?: string | null,
): string | null {
    if (!activeProblems.length) return null;
    if (selectedProblemId && activeProblems.some((problem) => problem.id === selectedProblemId)) {
        return selectedProblemId;
    }
    return activeProblems[0].id;
}

export function buildDashboardSelectionState<T extends DashboardEvolution>(
    evolutions: T[],
    activeProblems: DashboardProblemRef[],
    selectedProblemId?: string | null,
): DashboardSelectionState<T> {
    const resolvedProblemId = resolveSelectedProblemId(activeProblems, selectedProblemId);
    return {
        selectedProblemId: resolvedProblemId,
        evolutions: filterEvolutionsByProblem(evolutions, resolvedProblemId),
    };
}

export function latestTrendByProblem(
    evolutions: DashboardEvolution[],
): Record<string, EvolutionTrend> {
    const sorted = sortEvolutionsDesc(evolutions);
    const trendByProblem: Record<string, EvolutionTrend> = {};

    for (const evolution of sorted) {
        if (!evolution.problemId) continue;
        if (trendByProblem[evolution.problemId] !== undefined) continue;
        trendByProblem[evolution.problemId] = evolution.trend ?? null;
    }

    return trendByProblem;
}

export function toTrendIndicator(trend: EvolutionTrend): TrendIndicator {
    if (trend === 'worsening') {
        return { key: 'worsening', label: 'Empeorando', className: 'bg-rose-100 text-rose-700 border-rose-200' };
    }
    if (trend === 'improving') {
        return { key: 'improving', label: 'Mejorando', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    }
    if (trend === 'resolution') {
        return { key: 'resolution', label: 'Resolución', className: 'bg-sky-100 text-sky-700 border-sky-200' };
    }
    if (trend === 'stable') {
        return { key: 'stable', label: 'Estable', className: 'bg-amber-100 text-amber-700 border-amber-200' };
    }

    return { key: 'none', label: 'Sin tendencia', className: 'bg-slate-100 text-slate-700 border-slate-200' };
}
