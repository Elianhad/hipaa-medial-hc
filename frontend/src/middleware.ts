import { NextRequest, NextResponse } from 'next/server';

/**
 * Multi-tenant subdomain routing middleware.
 *
 * In production:
 *   drfulano.app.com  → professional tenant for slug "drfulano"
 *   clinica.app.com   → organization tenant for slug "clinica"
 *
 * In local dev (localhost / 127.0.0.1) subdomains don't resolve, so
 * the ?tenant=<slug>&tenantType=professional|org query params are used
 * as an alternative (useful for testing in Postman / curl).
 */

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000';

export function middleware(req: NextRequest) {
    const url = req.nextUrl.clone();
    const hostname = req.headers.get('host') ?? '';

    // Strip "www." prefix
    const host = hostname.replace(/^www\./, '');

    // Already on the root domain — no rewriting needed
    if (host === ROOT_DOMAIN || host.startsWith('localhost')) {
        return NextResponse.next();
    }

    // Extract subdomain:  "drfulano.app.com" → "drfulano"
    const subdomain = host.split('.')[0];
    if (!subdomain) return NextResponse.next();

    // The tenant type hint is stored in the subdomain registry on the
    // backend.  Until we can look it up cheaply in middleware, we route
    // all tenant subdomains to a unified tenant entry-point that resolves
    // the type server-side.
    //
    // Rewrite:  drfulano.app.com/<path>  →  /tenant/drfulano/<path>
    url.pathname = `/tenant/${subdomain}${url.pathname}`;
    return NextResponse.rewrite(url);
}

export const config = {
    matcher: [
        /*
         * Match all request paths EXCEPT:
         * - _next/static (static files)
         * - _next/image  (image optimisation)
         * - favicon.ico
         * - public assets
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
