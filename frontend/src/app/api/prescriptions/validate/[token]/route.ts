import { NextRequest, NextResponse } from 'next/server';
import { getBackendApiBaseUrl } from '@/lib/backend-api-url';

const BACKEND = getBackendApiBaseUrl();

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ token: string }> },
) {
    const resolved = await params;
    const url = `${BACKEND}/public/prescriptions/validate/${resolved.token}`;

    try {
        const upstream = await fetch(url, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
            },
            cache: 'no-store',
        });

        const data = await upstream.json().catch(() => ({}));
        return NextResponse.json(data, { status: upstream.status });
    } catch (error: any) {
        return NextResponse.json(
            {
                message: 'Validation service unavailable',
                detail: error?.message,
            },
            { status: 502 },
        );
    }
}
