import { NextRequest, NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';
import { getBackendApiBaseUrl } from '@/lib/backend-api-url';

const BACKEND = getBackendApiBaseUrl();

/** Proxy /api/clinical-records/* → backend /clinical-records/* */
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

    let token: string | undefined;
    try {
        const tokenResponse = await auth0.getAccessToken();
        token = tokenResponse?.token;
    } catch (err: unknown) {
        const detail = err instanceof Error ? err.message : String(err);
        console.error('[clinical-records proxy] getAccessToken error:', detail);
        return NextResponse.json({ message: 'No se pudo validar la sesion. Volve a iniciar sesion.' }, { status: 401 });
    }

    if (!token) {
        return NextResponse.json({ message: 'No access token available' }, { status: 401 });
    }

    const backendPath = `/clinical-records/${pathSegments.join('/')}`;
    const search = req.nextUrl.search;
    const url = `${BACKEND}${backendPath}${search}`;

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
    };

    const tenant = req.headers.get('x-tenant-id');
    if (tenant) headers['x-tenant-id'] = tenant;

    try {
        const body =
            method !== 'GET'
                ? await req.text().catch(() => undefined)
                : undefined;

        const upstream = await fetch(url, { method, headers, body, cache: 'no-store' });
        const json = await upstream.json().catch(() => ({}));

        if (!upstream.ok) {
            const message = (json as any)?.message ?? `Error ${upstream.status}`;
            return NextResponse.json(
                { message: Array.isArray(message) ? message.join(', ') : String(message) },
                { status: upstream.status },
            );
        }

        return NextResponse.json(json, { status: upstream.status });
    } catch {
        return NextResponse.json(
            { message: 'Servicio no disponible. Intente nuevamente.' },
            { status: 502 },
        );
    }
}
