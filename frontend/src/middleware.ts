import { NextRequest, NextResponse } from 'next/server';
import { auth0 } from './lib/auth0';

/**
 * Middleware composes two concerns:
 * 1. Auth0 session management — auto-mounts /auth/* routes and handles cookies.
 * 2. Multi-tenant subdomain routing — rewrites tenant subdomains to /tenant/<slug>/...
 *
 * In local dev (localhost / 127.0.0.1) subdomains don't resolve, so
 * the ?tenant=<slug>&tenantType=professional|org query params are used
 * as an alternative (useful for testing in Postman / curl).
 */

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000';

export async function middleware(req: NextRequest) {
    // Always run Auth0 middleware first so session cookies are set/read correctly.
    const authResponse = await auth0.middleware(req);

    const url = req.nextUrl.clone();
    const hostname = req.headers.get('host') ?? '';
    const host = hostname.replace(/^www\./, '');

    // On the root domain or localhost — no subdomain rewrite needed.
    if (host === ROOT_DOMAIN || host.startsWith('localhost')) {
        return authResponse;
    }

    // Extract subdomain:  "profesional-x.app.com" → "profesional-x"
    const subdomain = host.split('.')[0];
    if (!subdomain) return authResponse;

    // Rewrite:  profesional-x.app.com/<path>  →  /tenant/profesional-x/<path>
    url.pathname = `/tenant/${subdomain}${url.pathname}`;
    const rewriteResponse = NextResponse.rewrite(url);

    // Forward Auth0 session headers/cookies to the rewrite response.
    authResponse.headers.forEach((value, key) => {
        rewriteResponse.headers.set(key, value);
    });

    return rewriteResponse;
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
