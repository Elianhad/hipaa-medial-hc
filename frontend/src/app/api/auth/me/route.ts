import { NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';

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

/**
 * Returns the current Auth0 session user or null (anonymous).
 */
export async function GET(request: Request) {
    try {
        const session = await auth0.getSession();
        if (session?.user) {
            let registration: Record<string, unknown> | null = null;

            try {
                const tokenResponse = await auth0.getAccessToken();
                const token = tokenResponse?.token;
                const backendBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';
                const tenantIdHeader = request.headers.get('x-tenant-id') ?? undefined;
                const tenantSubdomain = extractTenantSubdomain(request.headers.get('host'));

                if (token) {
                    const registrationResponse = await fetch(`${backendBaseUrl}/auth/registration-status`, {
                        method: 'GET',
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                        cache: 'no-store',
                    });

                    if (registrationResponse.ok) {
                        registration = await registrationResponse.json().catch(() => null);
                    }
                }
            } catch {
                // Sync is best-effort and should not break session reads.
            }

            return NextResponse.json({
                ...session.user,
                appState: {
                    registration,
                },
            });
        }
    } catch {
        // Session unavailable — fall through to anonymous
    }

    return NextResponse.json(null);
}
