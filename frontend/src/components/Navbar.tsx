'use client';

import Link from 'next/link';
import { useUser } from '@/components/DemoSessionProvider';

export function Navbar() {
    const { user, isLoading } = useUser();
    const logoutHref = '/api/logout?returnTo=/';

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-white/10">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2">
                    <div className="text-xl font-bold bg-gradient-to-r from-sky-400 to-emerald-400 bg-clip-text text-transparent">
                        HEED
                    </div>
                </Link>

                {/* Navigation Links */}
                <div className="flex items-center gap-6">
                    <Link
                        href="/#features"
                        className="text-sm text-slate-300 hover:text-white transition"
                    >
                        Características
                    </Link>
                    <Link
                        href="/#portals"
                        className="text-sm text-slate-300 hover:text-white transition"
                    >
                        Portales
                    </Link>

                    {/* Auth Status */}
                    {!isLoading && (
                        <>
                            {user ? (
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-slate-300">
                                        Hola, {user.name}
                                    </span>
                                    <Link
                                        href="/dashboard"
                                        className="text-sm px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-600 text-white transition"
                                    >
                                        Mi Dashboard
                                    </Link>
                                    <a
                                        href={logoutHref}
                                        className="text-sm px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                                    >
                                        Salir
                                    </a>
                                </div>
                            ) : (
                                <Link
                                    href="/login"
                                    className="text-sm px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-600 text-white transition"
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
