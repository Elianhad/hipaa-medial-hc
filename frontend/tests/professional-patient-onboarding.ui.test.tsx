import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const pushMock = vi.fn();
const getBoardMock = vi.fn();
const patchAttendanceMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('@/components/ProfessionalPortalGuard', () => ({
  ProfessionalPortalGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/app/actions/professionals', () => ({
  getProfessionalTodayBoardAuto: () => getBoardMock(),
  patchAppointmentAttendance: (...args: unknown[]) => patchAttendanceMock(...args),
}));

vi.mock('@/components/forms/PatientRegistrationForm', () => ({
  PatientRegistrationForm: ({ onSuccess }: { onSuccess?: (patientId: string) => void }) => (
    <button type="button" onClick={() => onSuccess?.('patient-new-123')}>
      Completar alta mock
    </button>
  ),
}));

import ProfessionalDashboardPage from '../src/app/dashboard/professional/page';
import ProfessionalPacientesPage from '../src/app/dashboard/professional/pacientes/page';

describe('Professional patient onboarding', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    pushMock.mockReset();
    patchAttendanceMock.mockReset();
    getBoardMock.mockReset();
    getBoardMock.mockResolvedValue({
      items: [
        {
          id: 'appt-1',
          patientId: 'patient-1',
          patientName: 'Juan Perez',
          scheduledAt: '2026-04-25T09:00:00.000Z',
          reason: 'Control',
          attendance: 'pending',
        },
      ],
    });
  });

  it('opens walk-in modal and redirects to HC after registration from dashboard', async () => {
    render(React.createElement(ProfessionalDashboardPage));

    await screen.findByText('Portal del Profesional');
    expect(screen.getByRole('link', { name: /Pacientes/i })).toHaveAttribute(
      'href',
      '/dashboard/professional/pacientes',
    );

    fireEvent.click(screen.getByRole('button', { name: /Alta de paciente/i }));
    await screen.findByText('Registre un paciente que se presenta sin turno previo');

    fireEvent.click(screen.getByRole('button', { name: /Completar alta mock/i }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/dashboard/professional/pacientes/patient-new-123');
    });
    expect(screen.queryByText('Registre un paciente que se presenta sin turno previo')).not.toBeInTheDocument();
  });

  it('loads patients list, filters by search, paginates, and redirects after new registration', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 'p-1',
              firstName: 'Maria',
              lastName: 'Gonzalez',
              dni: '30111222',
              sex: 'F',
              birthDate: '1990-05-01',
              phone: '1111-1111',
              identityVerified: true,
            },
            {
              id: 'p-2',
              firstName: 'Pedro',
              lastName: 'Lopez',
              dni: '28999888',
              sex: 'M',
              identityVerified: false,
            },
          ],
          total: 21,
          page: 1,
          limit: 20,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 'p-3',
              firstName: 'Ana',
              lastName: 'Ruiz',
              dni: '33111222',
              sex: 'F',
              identityVerified: true,
            },
          ],
          total: 21,
          page: 2,
          limit: 20,
        }),
      });

    vi.stubGlobal('fetch', fetchMock);

    render(React.createElement(ProfessionalPacientesPage));

    await screen.findByText('Gonzalez, Maria');
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3001/v1/patients?page=1&limit=20');
    expect(screen.getByText(/Verificado/i)).toBeInTheDocument();
    expect(screen.getByText(/Sin verificar/i)).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Buscar por nombre, apellido o DNI…'), {
      target: { value: '30111222' },
    });
    expect(screen.getByText('Gonzalez, Maria')).toBeInTheDocument();
    expect(screen.queryByText('Lopez, Pedro')).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Buscar por nombre, apellido o DNI…'), {
      target: { value: '' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('http://localhost:3001/v1/patients?page=2&limit=20');
    });
    await screen.findByText('Ruiz, Ana');

    fireEvent.click(screen.getByRole('button', { name: /Nuevo Paciente/i }));
    await screen.findByText('Alta de Paciente');

    fireEvent.click(screen.getByRole('button', { name: /Completar alta mock/i }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/dashboard/professional/pacientes/patient-new-123');
    });
  });
});
