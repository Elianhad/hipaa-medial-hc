import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const pushMock = vi.fn();
const getOrgSummaryMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('@/components/OrganizationPortalGuard', () => ({
  OrganizationPortalGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/lib/organization-api', () => ({
  getOrgSummary: () => getOrgSummaryMock(),
}));

vi.mock('@/components/forms/PatientRegistrationForm', () => ({
  PatientRegistrationForm: ({ onSuccess }: { onSuccess?: (patientId: string) => void }) => (
    <button type="button" onClick={() => onSuccess?.('org-patient-456')}>
      Completar alta org mock
    </button>
  ),
}));

import OrganizationDashboardPage from '../src/app/dashboard/organization/page';
import OrgPacientesPage from '../src/app/dashboard/organization/pacientes/page';

describe('Organization patients onboarding', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    pushMock.mockReset();
    getOrgSummaryMock.mockReset();
    getOrgSummaryMock.mockResolvedValue({
      activeProfessionals: 6,
      todayConsultations: 22,
      pendingAudit: 3,
      billingInProgress: 8,
    });
  });

  it('shows quick access card to organization patients route', async () => {
    render(React.createElement(OrganizationDashboardPage));

    const link = await screen.findByRole('link', { name: /🩺 Pacientes/i });
    expect(link).toHaveAttribute('href', '/dashboard/organization/pacientes');
    expect(screen.getByText('Registrar y gestionar pacientes')).toBeInTheDocument();
  });

  it('loads organization patients list, preserves context copy, and redirects after registration', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            id: 'org-1',
            firstName: 'Lucia',
            lastName: 'Sosa',
            dni: '32123456',
            sex: 'F',
            identityVerified: true,
          },
          {
            id: 'org-2',
            firstName: 'Carlos',
            lastName: 'Mendez',
            dni: '27222333',
            sex: 'M',
            identityVerified: false,
          },
        ],
        total: 2,
        page: 1,
        limit: 20,
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(React.createElement(OrgPacientesPage));

    await screen.findByText('Sosa, Lucia');
    expect(screen.getByText('✅ Verificado')).toBeInTheDocument();
    expect(screen.getByText('⚠️ Sin verificar')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Buscar por nombre, apellido o DNI…'), {
      target: { value: 'mendez' },
    });
    expect(screen.getByText('Mendez, Carlos')).toBeInTheDocument();
    expect(screen.queryByText('Sosa, Lucia')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Nuevo Paciente/i }));

    await screen.findByText('Registro administrativo desde la organización');
    fireEvent.click(screen.getByRole('button', { name: /Completar alta org mock/i }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/dashboard/professional/pacientes/org-patient-456');
    });
  });
});
