import { NextRequest, NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';
import { getBackendApiBaseUrl } from '@/lib/backend-api-url';

const BACKEND_API_BASE_URL = getBackendApiBaseUrl();

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ path: string[] }> },
) {
    const resolved = await params;
    return proxy(req, resolved.path, 'GET');
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ path: string[] }> },
) {
    const resolved = await params;
    return proxy(req, resolved.path, 'POST');
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ path: string[] }> },
) {
    const resolved = await params;
    return proxy(req, resolved.path, 'PUT');
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ path: string[] }> },
) {
    const resolved = await params;
    return proxy(req, resolved.path, 'PATCH');
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ path: string[] }> },
) {
    const resolved = await params;
    return proxy(req, resolved.path, 'DELETE');
}

async function proxy(
    req: NextRequest,
    pathSegments: string[],
    method: string,
): Promise<NextResponse> {
    const session = await auth0.getSession();
    if (!session?.user) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const tokenResponse = await auth0.getAccessToken().catch(() => null);
    const token = tokenResponse?.token;
    if (!token) {
        return NextResponse.json({ message: 'No access token available' }, { status: 401 });
    }

    const backendPath = `/${pathSegments.join('/')}`;
    const search = req.nextUrl.search;
    const url = `${BACKEND_API_BASE_URL}${backendPath}${search}`;

    const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
    };

    const contentType = req.headers.get('content-type');
    if (contentType) {
        headers['Content-Type'] = contentType;
    }

    const tenant = req.headers.get('x-tenant-id')?.trim();
    if (tenant) {
        headers['x-tenant-id'] = tenant;
    } else {
        // Fallback: resolve tenant from backend registration status for tenant-scoped endpoints.
        const inferredTenantId = await resolveTenantIdFromRegistrationStatus(token);
        if (inferredTenantId) {
            headers['x-tenant-id'] = inferredTenantId;
        }
    }

    const body = method === 'GET' || method === 'DELETE'
        ? undefined
        : await req.text().catch(() => undefined);

    try {
        const upstream = await fetch(url, {
            method,
            headers,
            body,
            cache: 'no-store',
        });

        const raw = await upstream.text().catch(() => '');
        if (!upstream.ok) {
            const detail = raw || '<empty body>';
            console.error(`[protected proxy] ${method} ${backendPath} -> ${upstream.status}: ${detail}`);
        }
        if (!raw) {
            return new NextResponse(null, { status: upstream.status });
        }

        const json = JSON.parse(raw);
        return NextResponse.json(json, { status: upstream.status });
    } catch {
        return NextResponse.json({ message: 'Backend unreachable' }, { status: 502 });
    }
}

async function resolveTenantIdFromRegistrationStatus(token: string): Promise<string | undefined> {
    try {
        const res = await fetch(`${BACKEND_API_BASE_URL}/auth/registration-status`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json',
            },
            cache: 'no-store',
        });

        if (!res.ok) {
            return undefined;
        }

        const body = await res.json().catch(() => ({} as Record<string, unknown>));
        const tenantId = body?.tenantId;
        if (typeof tenantId === 'string' && tenantId.trim().length > 0) {
            return tenantId.trim();
        }

        return undefined;
    } catch {
        return undefined;
    }
}