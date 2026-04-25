'use client';

import Link from 'next/link';
import { useUser } from '@/components/SessionProvider';

export function Navbar() {
    const { user, isLoading } = useUser();
    const logoutHref = '/auth/logout';
    const needsRegistration = Boolean(user?.appState?.registration?.needsRegistration);

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-white/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full border border-sky-400/40 bg-slate-900 flex items-center justify-center text-sky-300 text-sm font-bold">
                        H
                    </div>
                    <div>
                        <div className="text-xl font-bold bg-gradient-to-r from-sky-400 to-emerald-400 bg-clip-text text-transparent leading-none">
                            HEED
                        </div>
                        <div className="hidden sm:block text-[10px] tracking-[0.24em] uppercase text-slate-500 mt-1">
                            Historia Clinica Inteligente
                        </div>
                    </div>
                </Link>

                <div className="hidden md:flex items-center gap-2 p-1 rounded-full border border-white/10 bg-white/[0.03]">
                    <Link
                        href="/#features"
                        className="text-sm text-slate-300 hover:text-white transition px-4 py-1.5 rounded-full"
                    >
                        Características
                    </Link>
                    <Link
                        href="/#portals"
                        className="text-sm text-slate-300 hover:text-white transition px-4 py-1.5 rounded-full"
                    >
                        Portales
                    </Link>
                </div>

                <div className="flex items-center gap-3">
                    {!isLoading && (
                        <>
                            {user ? (
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <span className="hidden lg:block text-sm text-slate-300 max-w-[12rem] truncate">
                                        Hola, {user.name}
                                    </span>
                                    <Link
                                        href="/dashboard"
                                        className="text-sm px-4 py-2 rounded-full bg-sky-500 hover:bg-sky-600 text-white transition"
                                    >
                                        Mi Dashboard
                                    </Link>
                                    {needsRegistration && (
                                        <Link
                                            href="/new-tenant"
                                            className="hidden sm:inline-flex text-sm px-4 py-2 rounded-full bg-amber-600 hover:bg-amber-500 text-white transition"
                                        >
                                            Completar alta
                                        </Link>
                                    )}
                                    <a
                                        href={logoutHref}
                                        className="text-sm px-4 py-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                                    >
                                        Salir
                                    </a>
                                </div>
                            ) : (
                                <Link
                                    href="/login"
                                    className="text-sm px-4 py-2 rounded-full bg-sky-500 hover:bg-sky-600 text-white transition"
                                >
                                    Ingresar
                                </Link>
                            )}
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}
