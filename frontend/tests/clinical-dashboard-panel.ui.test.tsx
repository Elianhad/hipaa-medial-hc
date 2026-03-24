import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { PatientProblem } from '../src/lib/clinical-problems-api';
import ClinicalDashboardPanel from '../src/components/chronic-care/ClinicalDashboardPanel';

function createProblem(id: string, title: string): PatientProblem {
    return {
        id,
        patientId: '11111111-1111-1111-1111-111111111111',
        title,
        status: 'active',
        category: 'chronic',
        clinicalStatus: 'active',
        createdAt: '2026-03-21T10:00:00.000Z',
    };
}

describe('ClinicalDashboardPanel interactions', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('updates timeline when selecting a different active problem', async () => {
        const problems: PatientProblem[] = [
            createProblem('p1', 'Hipertension arterial'),
            createProblem('p2', 'Diabetes tipo 2'),
        ];

        const evolutions = [
            {
                id: 'e1',
                problemId: 'p1',
                evolutionDate: '2026-03-20',
                evolutionTime: '08:30:00',
                trend: 'stable',
                subjective: 'Control de presion arterial en domicilio',
            },
            {
                id: 'e2',
                problemId: 'p2',
                evolutionDate: '2026-03-21',
                evolutionTime: '09:00:00',
                trend: 'improving',
                subjective: 'Mejora del control glucemico en la ultima semana',
            },
        ];

        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ data: evolutions }),
            }),
        );

        render(
            React.createElement(ClinicalDashboardPanel, {
                patientId: '11111111-1111-1111-1111-111111111111',
                problems,
            }),
        );

        await screen.findByText('Control de presion arterial en domicilio');
        expect(screen.queryByText('Mejora del control glucemico en la ultima semana')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /Diabetes tipo 2/i }));

        await waitFor(() => {
            expect(screen.getByText('Mejora del control glucemico en la ultima semana')).toBeInTheDocument();
        });

        expect(screen.queryByText('Control de presion arterial en domicilio')).not.toBeInTheDocument();
    });

    it('shows empty state when selected problem has no evolutions', async () => {
        const problems: PatientProblem[] = [
            createProblem('p1', 'Hipertension arterial'),
            createProblem('p2', 'Enfermedad renal cronica'),
        ];

        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    data: [
                        {
                            id: 'e1',
                            problemId: 'p1',
                            evolutionDate: '2026-03-20',
                            evolutionTime: '08:30:00',
                            trend: 'stable',
                            subjective: 'Seguimiento sin cambios clinicos relevantes',
                        },
                    ],
                }),
            }),
        );

        render(
            React.createElement(ClinicalDashboardPanel, {
                patientId: '11111111-1111-1111-1111-111111111111',
                problems,
            }),
        );

        await screen.findByText('Seguimiento sin cambios clinicos relevantes');

        fireEvent.click(screen.getByRole('button', { name: /Enfermedad renal cronica/i }));

        await waitFor(() => {
            expect(screen.getByText('No hay evoluciones registradas para este problema.')).toBeInTheDocument();
        });
    });
});
