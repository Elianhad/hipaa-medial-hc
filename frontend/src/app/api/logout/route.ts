import { NextResponse } from 'next/server';

const isAuth0Configured =
    process.env.AUTH0_CLIENT_ID &&
    process.env.AUTH0_CLIENT_ID !== 'CHANGE_ME' &&
    process.env.AUTH0_ISSUER_BASE_URL &&
    !process.env.AUTH0_ISSUER_BASE_URL.includes('your-tenant');

export async function GET(request: Request) {
    const url = new URL(request.url);
    const returnTo = url.searchParams.get('returnTo') ?? '/';
    const cookieHeader = request.headers.get('cookie') ?? '';
    const hasDemoSession = cookieHeader.includes('demo-session=');

    // Demo logout path: clear local cookie and return directly.
    if (hasDemoSession) {
        const response = NextResponse.redirect(new URL(returnTo, request.url));
        response.cookies.delete('demo-session');
        return response;
    }

    // Real auth path: let Auth0 clear its own session when enabled.
    if (isAuth0Configured) {
        return NextResponse.redirect(
            new URL(`/api/auth/logout?returnTo=${encodeURIComponent(returnTo)}`, request.url),
        );
    }

    return NextResponse.redirect(new URL(returnTo, request.url));
}
