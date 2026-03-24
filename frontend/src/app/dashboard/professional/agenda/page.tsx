import { getProfessionalLocationsAuto } from '@/app/actions/professionals';
import { ProfessionalPortalGuard } from '@/components/ProfessionalPortalGuard';
import { AgendaPageClient } from './(components)/AgendaPageClient';
import { ArrowLeftIcon } from 'lucide-react';

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
            <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-lime-50 to-teal-50 py-10 px-4">
                <div className="max-w-5xl mx-auto space-y-6">
                    <header className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">
                                Configuración de Agenda
                            </h1>
                            <p className="text-slate-500 mt-1">
                                Define horarios de atención, duración y pausas.
                            </p>
                        </div>
                        <a
                            href="/dashboard/professional"
                            className="flex items-center text-sm text-emerald-700 hover:underline"
                        >
                            <ArrowLeftIcon className="w-4 h-4" /> <span>Volver al portal profesional</span>
                        </a>
                    </header>

                    {error && (
                        <section className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                            {error}
                        </section>
                    )}

                    {locations.length > 0 && (
                        <AgendaPageClient initialLocations={locations} />
                    )}
                </div>
            </main>
        </ProfessionalPortalGuard>
    );
}
