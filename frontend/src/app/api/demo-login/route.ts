import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Demo users matching the seed data in database/seeds/001_demo_data.sql
const DEMO_USERS = {
    patient: {
        sub: 'demo|patient-001',
        name: 'Ana García (Demo)',
        email: 'paciente@demo.com',
        picture: 'https://api.dicebear.com/7.x/initials/svg?seed=AG',
        'https://hipaa-hce.example.com/roles': [],
    },
    professional: {
        sub: 'demo|professional-drfulano',
        name: 'Dr. Juan Fulano (Demo)',
        email: 'drfulano@demo.com',
        picture: 'https://api.dicebear.com/7.x/initials/svg?seed=JF',
        'https://hipaa-hce.example.com/roles': ['professional'],
    },
    orgadmin: {
        sub: 'demo|org-admin-clinica',
        name: 'María Ortega (Demo)',
        email: 'maria@clinica-demo.com',
        picture: 'https://api.dicebear.com/7.x/initials/svg?seed=MO',
        'https://hipaa-hce.example.com/roles': ['orgadmin'],
    },
} as const;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const role = (searchParams.get('role') ?? 'patient') as keyof typeof DEMO_USERS;
    const returnTo = searchParams.get('returnTo') ?? '/dashboard';

    const user = DEMO_USERS[role] ?? DEMO_USERS.patient;
    const encoded = Buffer.from(JSON.stringify(user)).toString('base64');

    const response = NextResponse.redirect(new URL(returnTo, request.url));
    response.cookies.set('demo-session', encoded, {
        httpOnly: true,
        secure: false, // dev only
        sameSite: 'lax',
        maxAge: 60 * 60 * 24, // 24h
        path: '/',
    });

    return response;
}
