import { UserRole } from '../enums/user-role.enum';

type AuthUser = Record<string, unknown> | undefined;

const ROLE_CLAIM_KEYS = [
    'roles',
    'role',
];

const ROLE_ALIASES: Record<UserRole, string[]> = {
    [UserRole.SuperAdmin]: ['superadmin'],
    [UserRole.TenantOrg]: ['tenantorg', 'orgadmin'],
    [UserRole.OrgAdmin]: ['orgadmin', 'tenantorg'],
    [UserRole.OrgStaff]: ['orgstaff'],
    [UserRole.TenantProf]: ['tenantprof', 'professional', 'prof'],
    [UserRole.Professional]: ['professional', 'tenantprof', 'prof'],
    [UserRole.Paciente]: ['paciente', 'patient'],
};

export function normalizeRole(role: string): string {
    return role.trim().toLowerCase().replace(/[\s_-]+/g, '');
}

export function extractNormalizedRoles(user: AuthUser): string[] {
    if (!user) {
        return [];
    }

    const roles = new Set<string>();

    for (const key of ROLE_CLAIM_KEYS) {
        const value = user[key];

        if (typeof value === 'string' && value.trim()) {
            roles.add(normalizeRole(value));
            continue;
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

export function hasRole(userRoles: string[], requiredRole: UserRole): boolean {
    const accepted = new Set(ROLE_ALIASES[requiredRole].map(normalizeRole));
    return userRoles.some((role) => accepted.has(normalizeRole(role)));
}

export function resolveCanonicalUserRole(user: AuthUser): UserRole {
    const userRoles = extractNormalizedRoles(user);

    if (hasRole(userRoles, UserRole.SuperAdmin)) return UserRole.SuperAdmin;
    if (hasRole(userRoles, UserRole.OrgAdmin)) return UserRole.OrgAdmin;
    if (hasRole(userRoles, UserRole.OrgStaff)) return UserRole.OrgStaff;
    if (hasRole(userRoles, UserRole.Professional)) return UserRole.Professional;
    if (hasRole(userRoles, UserRole.TenantOrg)) return UserRole.TenantOrg;
    if (hasRole(userRoles, UserRole.TenantProf)) return UserRole.TenantProf;

    return UserRole.Paciente;
}
