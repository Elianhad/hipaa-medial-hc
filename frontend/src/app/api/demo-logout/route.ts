import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const returnTo = searchParams.get('returnTo') ?? '/';

    const response = NextResponse.redirect(new URL(returnTo, request.url));
    response.cookies.delete('demo-session');

    return response;
}
