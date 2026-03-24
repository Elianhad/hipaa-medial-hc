import test from 'node:test';
import assert from 'node:assert/strict';
import {
    buildDashboardSelectionState,
    filterEvolutionsByProblem,
    latestTrendByProblem,
    resolveSelectedProblemId,
    sortEvolutionsDesc,
    toTrendIndicator,
} from '../src/lib/clinical-dashboard-utils';

const evolutions = [
    {
        id: 'e1',
        problemId: 'p1',
        evolutionDate: '2026-03-20',
        evolutionTime: '08:30:00',
        trend: 'stable' as const,
    },
    {
        id: 'e2',
        problemId: 'p1',
        evolutionDate: '2026-03-21',
        evolutionTime: '09:00:00',
        trend: 'improving' as const,
    },
    {
        id: 'e3',
        problemId: 'p2',
        evolutionDate: '2026-03-19',
        evolutionTime: '18:00:00',
        trend: 'worsening' as const,
    },
];

test('sortEvolutionsDesc orders by date and time descending', () => {
    const sorted = sortEvolutionsDesc(evolutions);
    assert.deepEqual(sorted.map((entry) => entry.id), ['e2', 'e1', 'e3']);
});

test('filterEvolutionsByProblem returns only selected problem sorted descending', () => {
    const filtered = filterEvolutionsByProblem(evolutions, 'p1');
    assert.deepEqual(filtered.map((entry) => entry.id), ['e2', 'e1']);
});

test('filterEvolutionsByProblem returns empty when no selected problem', () => {
    assert.equal(filterEvolutionsByProblem(evolutions, null).length, 0);
});

test('latestTrendByProblem picks most recent trend per problem', () => {
    const trends = latestTrendByProblem(evolutions);
    assert.equal(trends.p1, 'improving');
    assert.equal(trends.p2, 'worsening');
});

test('toTrendIndicator maps trends and fallback', () => {
    assert.equal(toTrendIndicator('improving').label, 'Mejorando');
    assert.equal(toTrendIndicator('worsening').key, 'worsening');
    assert.equal(toTrendIndicator(undefined).key, 'none');
});

test('resolveSelectedProblemId keeps valid selection or falls back to first active problem', () => {
    const activeProblems = [{ id: 'p1' }, { id: 'p2' }];

    assert.equal(resolveSelectedProblemId(activeProblems, 'p2'), 'p2');
    assert.equal(resolveSelectedProblemId(activeProblems, 'missing'), 'p1');
    assert.equal(resolveSelectedProblemId([], 'p1'), null);
});

test('buildDashboardSelectionState updates timeline when selected problem changes', () => {
    const activeProblems = [{ id: 'p1' }, { id: 'p2' }];

    const firstState = buildDashboardSelectionState(evolutions, activeProblems, 'p1');
    assert.equal(firstState.selectedProblemId, 'p1');
    assert.deepEqual(firstState.evolutions.map((entry) => entry.id), ['e2', 'e1']);

    const secondState = buildDashboardSelectionState(evolutions, activeProblems, 'p2');
    assert.equal(secondState.selectedProblemId, 'p2');
    assert.deepEqual(secondState.evolutions.map((entry) => entry.id), ['e3']);
});
