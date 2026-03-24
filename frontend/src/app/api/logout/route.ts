import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const requestUrl = new URL(request.url);
    const appBaseUrl = process.env.APP_BASE_URL ?? requestUrl.origin;
    const returnTo = requestUrl.searchParams.get('returnTo');
    const absoluteReturnTo = returnTo ? new URL(returnTo, appBaseUrl).toString() : appBaseUrl;

    return NextResponse.redirect(
        new URL(`/auth/logout?returnTo=${encodeURIComponent(absoluteReturnTo)}`, request.url),
    );
}
