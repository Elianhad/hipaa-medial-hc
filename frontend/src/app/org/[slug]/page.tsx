'use client';

/**
 * Public booking page for an organization.
 * URL: /org/[slug]   (or https://clinica.app.com/ in production)
 *
 * Patients can browse specialties and professionals, then book a slot.
 */

import { use, useEffect, useState } from 'react';
import { Building2, Calendar, User } from 'lucide-react';

interface OrgProfile {
    id: string;
    name: string;
    logoUrl: string | null;
    settings: Record<string, unknown>;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';

export default function PublicOrgBookingPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);
    const [org, setOrg] = useState<OrgProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        fetch(`${API}/tenants/by-subdomain/${slug}`)
            .then((r) => {
                if (!r.ok) { setNotFound(true); return null; }
                return r.json();
            })
            .then((data) => { if (data) setOrg(data); })
            .catch(() => setNotFound(true))
            .finally(() => setLoading(false));
    }, [slug]);

    if (loading) {
        return (
            <main className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="animate-pulse text-slate-400">Cargando…</div>
            </main>
        );
    }

    if (notFound || !org) {
        return (
            <main className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
                <div className="text-center space-y-3">
                    <h1 className="text-2xl font-bold">Organización no encontrada</h1>
                    <a href="/" className="text-indigo-400 underline text-sm">Volver al inicio</a>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 shadow-sm">
                <div className="max-w-4xl mx-auto px-4 py-6 flex gap-5 items-center">
                    <div className="w-16 h-16 rounded-xl bg-indigo-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {org.logoUrl ? (
                            <img src={org.logoUrl} alt={org.name} className="w-full h-full object-cover" />
                        ) : (
                            <Building2 className="w-8 h-8 text-indigo-400" />
                        )}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">{org.name}</h1>
                        <p className="text-slate-500 text-sm">Reservá tu turno en línea</p>
                    </div>
                </div>
            </header>

            <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
                {/* Specialties / Professionals grid */}
                <section className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                    <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <User className="w-5 h-5 text-indigo-500" />
                        Nuestros profesionales
                    </h2>
                    {/* TODO: Fetch and render org's professional list */}
                    <div className="rounded-lg border-2 border-dashed border-slate-200 p-8 text-center text-slate-400 text-sm">
                        Listado de especialistas — próximamente
                    </div>
                </section>

                {/* Booking CTA */}
                <section className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                    <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-indigo-500" />
                        Reservar turno
                    </h2>
                    <a
                        href={`/org/${slug}/nuevo`}
                        className="block w-full text-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                    >
                        Pedir turno
                    </a>
                </section>
            </div>
        </main>
    );
}
