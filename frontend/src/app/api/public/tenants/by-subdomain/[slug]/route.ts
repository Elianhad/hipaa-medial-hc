import { NextResponse } from 'next/server';
import { getBackendApiBaseUrl } from '@/lib/backend-api-url';

const BACKEND_API_BASE_URL = getBackendApiBaseUrl();

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ slug: string }> },
) {
    const resolved = await params;
    const slug = resolved.slug?.trim();
    if (!slug) {
        return NextResponse.json({ message: 'slug is required' }, { status: 400 });
    }

    try {
        const upstream = await fetch(`${BACKEND_API_BASE_URL}/tenants/by-subdomain/${encodeURIComponent(slug)}`, {
            method: 'GET',
            cache: 'no-store',
            headers: {
                Accept: 'application/json',
            },
        });

        const data = await upstream.json().catch(() => ({}));
        return NextResponse.json(data, { status: upstream.status });
    } catch {
        return NextResponse.json({ message: 'Backend unreachable' }, { status: 502 });
    }
}