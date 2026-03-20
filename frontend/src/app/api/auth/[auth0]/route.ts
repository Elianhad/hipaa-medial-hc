import { NextResponse } from 'next/server';

const isAuth0Configured =
    process.env.AUTH0_CLIENT_ID &&
    process.env.AUTH0_CLIENT_ID !== 'CHANGE_ME' &&
    process.env.AUTH0_ISSUER_BASE_URL &&
    !process.env.AUTH0_ISSUER_BASE_URL.includes('your-tenant');

export async function GET(req: Request, context: { params: Promise<{ auth0: string[] }> }) {
    if (!isAuth0Configured) {
        const url = new URL(req.url);
        return NextResponse.redirect(
            new URL('/login?error=auth0_not_configured', url.origin),
        );
    }

    // Dynamically import so the Auth0 SDK only initializes when credentials are real
    const { handleAuth } = await import('@auth0/nextjs-auth0');
    return handleAuth()(req, context);
}
