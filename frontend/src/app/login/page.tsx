'use client';

import { useEffect } from 'react';
import { useUser } from '@/components/DemoSessionProvider';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
    const { user, isLoading } = useUser();
    const router = useRouter();
    const searchParams = useSearchParams();

    const returnTo = searchParams.get('returnTo') || '/dashboard';
    const error = searchParams.get('error');

    useEffect(() => {
        if (!isLoading && user) {
            router.push(returnTo);
        }
    }, [user, isLoading, router, returnTo]);

    if (isLoading) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mx-auto mb-4" />
                    <p className="text-slate-300">Verificando tu sesiÃ³n...</p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.12),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(132,204,22,0.12),transparent_40%)]" />

            <div className="relative w-full max-w-md">
                <div className="rounded-2xl border border-white/10 bg-slate-900/50 backdrop-blur-xl p-8 shadow-2xl">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <Link href="/" className="inline-block mb-6">
                            <div className="text-3xl font-bold bg-gradient-to-r from-sky-400 to-emerald-400 bg-clip-text text-transparent">
                                HEED
                            </div>
                        </Link>
                        <h1 className="text-2xl font-bold text-white">Acceso a la Plataforma</h1>
                        <p className="mt-2 text-slate-400 text-sm">
                            IniciÃ¡ sesiÃ³n con tu cuenta para continuar
                        </p>
                    </div>

                    {/* Error banner */}
                    {error === 'auth0_not_configured' && (
                        <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
                            Auth0 no estÃ¡ configurado aÃºn. CompletÃ¡ las variables en <code className="font-mono">.env.local</code> para habilitar el login.
                        </div>
                    )}

                    {/* Auth0 button â€” always visible */}
                    <a
                        href={`/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`}
                        className="w-full bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                        Iniciar SesiÃ³n con Auth0
                    </a>

                    <p className="mt-3 text-xs text-slate-500 text-center">
                        AutenticaciÃ³n segura conforme a estÃ¡ndares HIPAA
                    </p>

                    {/* Demo link */}
                    <div className="mt-8 pt-6 border-t border-white/10 text-center">
                        <p className="text-xs text-slate-500 mb-2">Â¿QuerÃ©s explorar sin cuenta?</p>
                        <Link
                            href="/demo"
                            className="text-sm text-sky-400 hover:text-sky-300 transition font-medium"
                        >
                            Probar el sistema con usuarios demo â†’
                        </Link>
                    </div>

                    <div className="mt-6 text-center">
                        <Link href="/" className="text-xs text-slate-500 hover:text-slate-300 transition">
                            â† Volver a inicio
                        </Link>
                    </div>
                </div>

                <div className="mt-6 rounded-lg border border-white/10 bg-white/5 backdrop-blur p-4 flex gap-3">
                    <div className="text-lg">ðŸ”’</div>
                    <div className="text-xs text-slate-400">
                        <p className="font-semibold text-white mb-1">Seguridad HIPAA</p>
                        <p>Tus datos se transfieren encriptados. VerificaciÃ³n de identidad con JWT + JWKS de Auth0.</p>
                    </div>
                </div>
            </div>
        </main>
    );
}
