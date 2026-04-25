import { NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';
import { getBackendApiBaseUrl } from '@/lib/backend-api-url';

type AccessContextKind = 'patient' | 'professional' | 'organization' | 'superadmin';

function normalizeRole(role: string): string {
    return role.trim().toLowerCase().replace(/[\s_-]+/g, '');
}

function extractRoles(user: Record<string, unknown>): string[] {
    const claimKeys = [
        'roles',
        'role',
        'https://hipaa-hce/roles',
        'https://hipaa-hce/role',
        'https://hipaa-hce.example.com/roles',
        'https://hipaa-hce.example.com/role',
        'https://hipaa-medial-hc.example.com/roles',
        'https://hipaa-medial-hc.example.com/role',
    ];

    const roles = new Set<string>();
    for (const key of claimKeys) {
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

function buildFallbackContext(user: Record<string, unknown>) {
    const roles = extractRoles(user);
    const contexts: Array<{ kind: AccessContextKind; enabled: boolean; label: string }> = [
        { kind: 'patient', enabled: true, label: 'Paciente' },
    ];

    if (roles.some((role) => ['professional', 'tenantprof', 'prof'].includes(role))) {
        contexts.push({ kind: 'professional', enabled: true, label: 'Profesional' });
    }

    if (roles.some((role) => ['orgadmin', 'orgstaff', 'tenantorg'].includes(role))) {
        contexts.push({ kind: 'organization', enabled: true, label: 'Organizacion' });
    }

    if (roles.includes('superadmin')) {
        contexts.push({ kind: 'superadmin', enabled: true, label: 'SuperAdmin' });
    }

    const defaultContext: AccessContextKind = roles.some((role) => ['orgadmin', 'orgstaff', 'tenantorg'].includes(role))
        ? 'organization'
        : 'patient';

    return {
        identity: {
            sub: typeof user.sub === 'string' ? user.sub : '',
            email: typeof user.email === 'string' ? user.email : undefined,
            name: typeof user.name === 'string' ? user.name : undefined,
        },
        roles,
        contexts,
        defaultContext,
    };
}

function extractTenantSubdomain(host: string | null): string | undefined {
    if (!host) {
        return undefined;
    }

    const hostWithoutPort = host.split(':')[0].trim().toLowerCase();
    if (!hostWithoutPort) {
        return undefined;
    }

    const parts = hostWithoutPort.split('.').filter(Boolean);
    if (parts.length >= 3) {
        return parts[0];
    }

    if (parts.length === 2 && parts[1] === 'localhost') {
        return parts[0];
    }

    return undefined;
}

export async function GET(request: Request) {
    const session = await auth0.getSession();
    if (!session?.user) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const backendBaseUrl = getBackendApiBaseUrl();

    try {
        const tokenResponse = await auth0.getAccessToken();
        const token = tokenResponse?.token;

        if (!token) {
            throw new Error('No access token available');
        }

        const tenantIdHeader = request.headers.get('x-tenant-id') ?? undefined;
        const tenantSubdomain = extractTenantSubdomain(request.headers.get('host'));
        const response = await fetch(`${backendBaseUrl}/auth/context`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                ...(tenantIdHeader ? { 'x-tenant-id': tenantIdHeader } : {}),
                ...(tenantSubdomain ? { 'x-tenant-subdomain': tenantSubdomain } : {}),
            },
            cache: 'no-store',
        });

        if (!response.ok) {
            throw new Error(`Backend context endpoint failed with status ${response.status}`);
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch {
        // Fallback keeps frontend flow alive even if backend token exchange is not configured yet.
        return NextResponse.json(buildFallbackContext(session.user as Record<string, unknown>));
    }
}
