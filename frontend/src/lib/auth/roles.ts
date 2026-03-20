type AuthUser = Record<string, unknown> | null | undefined;

const ROLE_CLAIM_KEYS = [
    'roles',
    'role',
    'https://hipaa-hce.example.com/roles',
    'https://hipaa-hce.example.com/role',
    'https://hipaa-medial-hc.example.com/roles',
    'https://hipaa-medial-hc.example.com/role',
];

function normalizeRole(role: string): string {
    return role.trim().toLowerCase().replace(/[\s_-]+/g, '');
}

export function extractRoles(user: AuthUser): string[] {
    if (!user) {
        return [];
    }

    const roles = new Set<string>();

    for (const key of ROLE_CLAIM_KEYS) {
        const value = user[key];
        if (typeof value === 'string' && value.trim()) {
            roles.add(normalizeRole(value));
        }
        if (Array.isArray(value)) {
            for (const role of value) {
                if (typeof role === 'string' && role.trim()) {
                    roles.add(normalizeRole(role));
                }
            }
        }
    }

    return Array.from(roles);
}

export function hasAnyRole(roles: string[], acceptedRoles: string[]): boolean {
    if (acceptedRoles.length === 0) {
        return true;
    }

    const accepted = new Set(acceptedRoles.map(normalizeRole));
    return roles.some((role) => accepted.has(normalizeRole(role)));
}

export function canAccessProfessionalPortal(roles: string[]): boolean {
    return hasAnyRole(roles, ['professional', 'tenant_prof', 'tenantprof']);
}

export function canAccessOrganizationPortal(roles: string[]): boolean {
    return hasAnyRole(roles, ['orgadmin', 'orgstaff', 'tenant_org', 'tenantorg']);
}