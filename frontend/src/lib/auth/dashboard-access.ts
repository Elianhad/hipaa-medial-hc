import {
    canAccessOrganizationPortal,
    canAccessProfessionalPortal,
} from './roles';

export type DashboardCardId = 'patient' | 'professional' | 'organization';

export interface DashboardCardState {
    id: DashboardCardId;
    title: string;
    description: string;
    href: string;
    enabled: boolean;
}

export function getDashboardCardStates(roles: string[]): DashboardCardState[] {
    return [
        {
            id: 'patient',
            title: 'Paciente',
            description: 'Turnos, historial y datos personales.',
            href: '/dashboard/patient',
            enabled: true,
        },
        {
            id: 'professional',
            title: 'Profesional',
            description: 'Agenda, pacientes y configuracion.',
            href: '/dashboard/professional',
            enabled: canAccessProfessionalPortal(roles),
        },
        {
            id: 'organization',
            title: 'Organizacion',
            description: 'Staff, agenda y facturacion.',
            href: '/dashboard/organization',
            enabled: canAccessOrganizationPortal(roles),
        },
    ];
}