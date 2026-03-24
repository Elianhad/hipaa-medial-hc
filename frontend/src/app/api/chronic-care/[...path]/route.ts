import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:4000';

/** Proxy /api/chronic-care/* → backend /chronic-care/* */
export async function GET(
    req: NextRequest,
    { params }: { params: { path: string[] } },
) {
    return proxy(req, params.path, 'GET');
}

export async function POST(
    req: NextRequest,
    { params }: { params: { path: string[] } },
) {
    return proxy(req, params.path, 'POST');
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: { path: string[] } },
) {
    return proxy(req, params.path, 'PATCH');
}

async function proxy(
    req: NextRequest,
    pathSegments: string[],
    method: string,
): Promise<NextResponse> {
    const backendPath = `/chronic-care/${pathSegments.join('/')}`;
    const search = req.nextUrl.search;
    const url = `${BACKEND}${backendPath}${search}`;

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    // Forward Authorization header
    const auth = req.headers.get('authorization');
    if (auth) headers['Authorization'] = auth;

    // Forward tenant header
    const tenant = req.headers.get('x-tenant-id');
    if (tenant) headers['x-tenant-id'] = tenant;

    try {
        const body =
            method !== 'GET'
                ? await req.text().catch(() => undefined)
                : undefined;

        const upstream = await fetch(url, { method, headers, body });
        const json = await upstream.json().catch(() => ({}));

        return NextResponse.json(json, { status: upstream.status });
    } catch (err: any) {
        return NextResponse.json(
            { message: 'Backend unreachable', detail: err?.message },
            { status: 502 },
        );
    }
}
