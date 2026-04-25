import { UserRole } from '../enums/user-role.enum';

type AuthUser = Record<string, unknown> | undefined;

const ROLE_CLAIM_KEYS = [
    'roles',
    'role',
    'https://hipaa-hce/roles',
    'https://hipaa-hce/role',
    'https://hipaa-hce.example.com/roles',
    'https://hipaa-hce.example.com/role',
    'https://hipaa-medial-hc.example.com/roles',
    'https://hipaa-medial-hc.example.com/role',
];

const ROLE_CLAIM_SUFFIXES = ['/roles', '/role'];

function addRoleValue(roles: Set<string>, value: unknown): void {
    if (typeof value === 'string' && value.trim()) {
        roles.add(normalizeRole(value));
        return;
    }

    if (Array.isArray(value)) {
        for (const role of value) {
            if (typeof role === 'string' && role.trim()) {
                roles.add(normalizeRole(role));
            }
        }
    }
}

const ROLE_ALIASES: Record<UserRole, string[]> = {
    [UserRole.SuperAdmin]: ['superadmin'],
    [UserRole.OrgAdmin]: ['orgadmin', 'tenantorg'],
    [UserRole.OrgStaff]: ['orgstaff'],
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
        addRoleValue(roles, user[key]);
    }

    for (const [key, value] of Object.entries(user)) {
        const isKnownRoleKey = ROLE_CLAIM_KEYS.includes(key);
        if (isKnownRoleKey) {
            continue;
        }

        const isNamespacedRoleClaim = ROLE_CLAIM_SUFFIXES.some((suffix) =>
            key.toLowerCase().endsWith(suffix),
        );

        if (isNamespacedRoleClaim) {
            addRoleValue(roles, value);
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

    return UserRole.Paciente;
}
