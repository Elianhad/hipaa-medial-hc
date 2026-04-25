import { getProfessionalLocationsAuto } from '@/app/actions/professionals';
import { ProfessionalPortalGuard } from '@/components/ProfessionalPortalGuard';
import { AgendaPageClient } from './(components)/AgendaPageClient';
import { ArrowLeftIcon } from 'lucide-react';
import Link from 'next/link';

export default async function ProfessionalAgendaPage() {
    let locations = [];
    let error: string | null = null;

    try {
        locations = await getProfessionalLocationsAuto();
    } catch (err: any) {
        error = err?.message ?? 'Error al cargar locaciones';
    }

    return (
        <ProfessionalPortalGuard>
            <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#f2f6f5_100%)] py-8 px-4 sm:py-10">
                <div className="mx-auto max-w-5xl space-y-8">
                    <header className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm sm:p-8">
                        <div className="flex flex-wrap items-end justify-between gap-4">
                            <div className="max-w-2xl">
                                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Panel clinico diario</p>
                                <h1 className="mt-3 text-[clamp(2rem,4vw,2.75rem)] font-bold leading-tight text-slate-900">
                                    Configuración de Agenda
                                </h1>
                                <p className="mt-2 text-slate-600">
                                    Define horarios de atencion, duracion y pausas con una estructura clara para la jornada.
                                </p>
                            </div>
                            <Link
                                href="/dashboard/professional"
                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-400"
                            >
                                <ArrowLeftIcon className="h-4 w-4" /> <span>Volver al portal profesional</span>
                            </Link>
                        </div>
                    </header>

                    {error && (
                        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                            {error}
                        </section>
                    )}

                    {locations.length > 0 && (
                        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                            <AgendaPageClient initialLocations={locations} />
                        </section>
                    )}

                    {locations.length === 0 && !error && (
                        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h2 className="text-lg font-semibold text-slate-900">Sin locaciones configuradas</h2>
                            <p className="mt-2 text-sm text-slate-600">
                                Cuando tengas sedes o consultorios asignados, vas a poder definir la agenda desde esta vista.
                            </p>
                        </section>
                    )}

                    <footer className="border-t border-slate-200 pt-6 text-sm text-slate-500">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <p>HEED · Portal del Profesional</p>
                            <p>Planificacion diaria y disponibilidad por sede</p>
                        </div>
                    </footer>
                </div>
            </main>
        </ProfessionalPortalGuard>
    );
}
