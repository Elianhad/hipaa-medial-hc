'use client';

/**
 * Public booking page for an independent professional.
 * URL: /booking/[slug]   (or https://drfulano.app.com/ in production)
 *
 * Patients can browse the professional's profile and book a slot
 * WITHOUT being logged in.  Auth is only required at checkout.
 */

import { use, useEffect, useState } from 'react';
import { Calendar, Clock, MapPin, Star, User } from 'lucide-react';

interface ProfessionalProfile {
    id: string;
    name: string;
    specialty: string;
    bio: string;
    photoUrl: string | null;
    consultationFee: number | null;
    tenantName: string;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';

export default function PublicProfessionalBookingPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);
    const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        fetch(`${API}/tenants/by-subdomain/${slug}`)
            .then((r) => {
                if (!r.ok) { setNotFound(true); return null; }
                return r.json();
            })
            .then((data) => {
                if (data) setProfile(data);
            })
            .catch(() => setNotFound(true))
            .finally(() => setLoading(false));
    }, [slug]);

    if (loading) {
        return (
            <main className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="animate-pulse text-slate-400">Cargando perfil…</div>
            </main>
        );
    }

    if (notFound || !profile) {
        return (
            <main className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
                <div className="text-center space-y-3">
                    <h1 className="text-2xl font-bold">Profesional no encontrado</h1>
                    <a href="/" className="text-indigo-400 underline text-sm">Volver al inicio</a>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-slate-50">
            {/* Hero header */}
            <header className="bg-white border-b border-slate-200 shadow-sm">
                <div className="max-w-3xl mx-auto px-4 py-8 flex gap-6 items-center">
                    <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {profile.photoUrl ? (
                            <img src={profile.photoUrl} alt={profile.name} className="w-full h-full object-cover" />
                        ) : (
                            <User className="w-10 h-10 text-indigo-400" />
                        )}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">{profile.name}</h1>
                        <p className="text-indigo-600 font-medium">{profile.specialty}</p>
                        {profile.consultationFee && (
                            <p className="text-sm text-slate-500 mt-1">
                                Consulta: <span className="font-semibold text-slate-700">${profile.consultationFee}</span>
                            </p>
                        )}
                    </div>
                </div>
            </header>

            <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
                {/* Bio */}
                {profile.bio && (
                    <section className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                        <h2 className="font-semibold text-slate-800 mb-2">Sobre el profesional</h2>
                        <p className="text-slate-600 text-sm leading-relaxed">{profile.bio}</p>
                    </section>
                )}

                {/* Booking CTA */}
                <section className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                    <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-indigo-500" />
                        Reservar turno
                    </h2>
                    <p className="text-slate-500 text-sm mb-4">
                        Seleccioná una fecha y horario disponible para tu consulta.
                    </p>
                    {/* TODO: Replace with a real calendar/slot picker component */}
                    <div className="rounded-lg border-2 border-dashed border-slate-200 p-8 text-center text-slate-400 text-sm">
                        Selector de turnos — próximamente
                    </div>
                    <a
                        href={`/booking/${slug}/nuevo`}
                        className="mt-4 block w-full text-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                    >
                        Pedir turno
                    </a>
                </section>
            </div>
        </main>
    );
}
