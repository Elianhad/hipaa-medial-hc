'use client';

import { ReactNode } from 'react';
import { useUser } from '@/components/DemoSessionProvider';
import { canAccessProfessionalPortal, extractRoles } from '@/lib/auth/roles';

interface ProfessionalPortalGuardProps {
    children: ReactNode;
}

export function ProfessionalPortalGuard({ children }: ProfessionalPortalGuardProps) {
    const { user, isLoading } = useUser();

    if (isLoading) {
        return (
            <main className="min-h-[70vh] bg-slate-950 text-white px-6 py-16">
                <div className="mx-auto max-w-4xl rounded-2xl border border-white/10 bg-white/5 p-8">
                    <p className="text-slate-300">Validando acceso...</p>
                </div>
            </main>
        );
    }

    if (!user) {
        return (
            <main className="min-h-[70vh] bg-slate-950 text-white px-6 py-16">
                <div className="mx-auto max-w-4xl rounded-2xl border border-white/10 bg-white/5 p-8">
                    <h1 className="text-3xl font-semibold">Acceso Denegado</h1>
                    <p className="mt-3 text-slate-300">Necesitás iniciar sesión para acceder a este portal.</p>
                    <div className="mt-6 flex flex-wrap gap-3">
                        <a
                            href="/login"
                            className="rounded-lg bg-sky-500 px-5 py-2 text-sm font-medium text-white hover:bg-sky-600"
                        >
                            Ingresar
                        </a>
                        <a href="/" className="rounded-lg border border-white/20 px-5 py-2 text-sm font-medium text-white hover:border-white/40">
                            Volver a inicio
                        </a>
                    </div>
                </div>
            </main>
        );
    }

    const roles = extractRoles(user);
    const hasAccess = canAccessProfessionalPortal(roles);

    if (!hasAccess) {
        return (
            <main className="min-h-[70vh] bg-slate-950 text-white px-6 py-16">
                <div className="mx-auto max-w-4xl rounded-2xl border border-white/10 bg-white/5 p-8">
                    <h1 className="text-3xl font-semibold">Acceso Denegado</h1>
                    <p className="mt-3 text-slate-300">Tu rol actual no habilita acceso al portal de profesionales.</p>
                    <div className="mt-6 flex flex-wrap gap-3">
                        <a href="/dashboard" className="rounded-lg bg-sky-500 px-5 py-2 text-sm font-medium text-white hover:bg-sky-600">
                            Ir al dashboard
                        </a>
                        <a href="/" className="rounded-lg border border-white/20 px-5 py-2 text-sm font-medium text-white hover:border-white/40">
                            Volver a inicio
                        </a>
                    </div>
                </div>
            </main>
        );
    }

    return <>{children}</>;
}
