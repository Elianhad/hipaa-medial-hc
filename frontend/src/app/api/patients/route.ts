import { NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';
import { getBackendApiBaseUrl } from '@/lib/backend-api-url';

const BACKEND_URL = getBackendApiBaseUrl();

export async function POST(request: Request) {
    const session = await auth0.getSession();
    if (!session?.user) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const payload = await request.json().catch(() => ({}));

    try {
        const tokenResponse = await auth0.getAccessToken();
        const token = tokenResponse?.token;

        if (!token) {
            throw new Error('No access token available');
        }

        const response = await fetch(`${BACKEND_URL}/patients`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
            cache: 'no-store',
        });

        const data = await response.json().catch(() => ({}));
        return NextResponse.json(data, { status: response.status });
    } catch {
        return NextResponse.json({ message: 'Patients service unavailable' }, { status: 502 });
    }
}
