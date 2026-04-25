import { NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';
import { getBackendApiBaseUrl } from '@/lib/backend-api-url';

export async function POST(request: Request) {
    const session = await auth0.getSession();
    if (!session?.user) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const payload = await request.json().catch(() => ({}));
    const context = typeof payload.context === 'string' ? payload.context : '';

    if (!context) {
        return NextResponse.json({ message: 'context is required' }, { status: 400 });
    }

    const backendBaseUrl = getBackendApiBaseUrl();

    try {
        const tokenResponse = await auth0.getAccessToken();
        const token = tokenResponse?.token;

        if (!token) {
            throw new Error('No access token available');
        }

        const response = await fetch(`${backendBaseUrl}/auth/context/select`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ context }),
        });

        const data = await response.json().catch(() => ({}));
        return NextResponse.json(data, { status: response.status });
    } catch {
        // Local fallback for early implementation while backend/session persistence is evolving.
        return NextResponse.json({ selectedContext: context, persisted: false, fallback: true });
    }
}
