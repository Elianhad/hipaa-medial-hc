import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Custom /api/auth/me handler.
 * Priority: demo-session cookie → Auth0 session → null (anonymous).
 *
 * This overrides the default @auth0/nextjs-auth0 handler so that demo logins
 * work without a real Auth0 tenant configured.
 */
export async function GET() {
    const cookieStore = await cookies();
    const demoSession = cookieStore.get('demo-session');

    // 1. Demo session takes priority
    if (demoSession?.value) {
        try {
            const user = JSON.parse(Buffer.from(demoSession.value, 'base64').toString());
            return NextResponse.json(user);
        } catch {
            // Corrupted demo cookie — fall through
        }
    }

    // 2. Real Auth0 session
    const auth0ClientId = process.env.AUTH0_CLIENT_ID;
    const isAuth0Configured = auth0ClientId && auth0ClientId !== 'CHANGE_ME';

    if (isAuth0Configured) {
        try {
            const { getSession } = await import('@auth0/nextjs-auth0');
            const session = await getSession();
            if (session?.user) {
                return NextResponse.json(session.user);
            }
        } catch {
            // Auth0 fetch error — fall through to anonymous
        }
    }

    // 3. Anonymous
    return NextResponse.json(null);
}
