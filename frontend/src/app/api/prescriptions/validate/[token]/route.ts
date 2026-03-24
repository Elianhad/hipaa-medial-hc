import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:4000';

export async function GET(
    _req: NextRequest,
    { params }: { params: { token: string } },
) {
    const url = `${BACKEND}/public/prescriptions/validate/${params.token}`;

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
