import {
    canAccessOrganizationPortal,
    canAccessProfessionalPortal,
} from './roles';

export type PortalId = 'patient' | 'professional' | 'organization';

export interface PortalLink {
    label: string;
    href: string;
}

export interface LandingPortal {
    id: PortalId;
    href: string;
    title: string;
    description: string;
    accent: string;
    links: PortalLink[];
}

export interface PortalAccessState {
    showLinks: boolean;
    showLoginCta: boolean;
    accessDenied: boolean;
}

export const LANDING_PORTALS: LandingPortal[] = [
    {
        id: 'patient',
        href: '/dashboard/patient',
        title: 'Portal del Paciente',
        description: 'Alta, historia clínica consolidada y gestión de turnos.',
        accent: 'from-sky-500 to-cyan-400',
        links: [
            { label: 'Registrarse', href: '/dashboard/patient' },
            { label: 'Mis turnos', href: '/dashboard/patient/turnos' },
            { label: 'Mi historia clínica', href: '/dashboard/patient/historial' },
        ],
    },
    {
        id: 'professional',
        href: '/dashboard/professional',
        title: 'Portal del Profesional',
        description: 'Agenda, pacientes y evoluciones SOAP para independientes.',
        accent: 'from-emerald-500 to-lime-400',
        links: [
            { label: 'Dashboard', href: '/dashboard/professional' },
            { label: 'Agenda', href: '/dashboard/professional/agenda' },
            { label: 'Pacientes', href: '/dashboard/professional/pacientes' },
            { label: 'Configuración', href: '/dashboard/professional/config' },
        ],
    },
    {
        id: 'organization',
        href: '/dashboard/organization',
        title: 'Portal de la Organización',
        description: 'Gestión de staff, agenda multi-profesional y facturación.',
        accent: 'from-orange-500 to-amber-400',
        links: [
            { label: 'Admin', href: '/dashboard/organization' },
            { label: 'Staff', href: '/dashboard/organization/staff' },
            { label: 'Agenda', href: '/dashboard/organization/agenda' },
            { label: 'Facturación', href: '/dashboard/organization/billing' },
        ],
    },
];

export function getPortalAccessState(
    portalId: PortalId,
    isLoggedIn: boolean,
    roles: string[],
): PortalAccessState {
    if (portalId === 'patient') {
        return {
            showLinks: true,
            showLoginCta: false,
            accessDenied: false,
        };
    }

    if (!isLoggedIn) {
        return {
            showLinks: false,
            showLoginCta: true,
            accessDenied: false,
        };
    }

    const hasAccess =
        portalId === 'professional'
            ? canAccessProfessionalPortal(roles)
            : canAccessOrganizationPortal(roles);

    return {
        showLinks: hasAccess,
        showLoginCta: false,
        accessDenied: !hasAccess,
    };
}