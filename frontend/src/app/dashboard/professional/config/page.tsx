import { getProfessionalLocationsAuto } from '@/app/actions/professionals';
import { ProfessionalPortalGuard } from '@/components/ProfessionalPortalGuard';
import { ConfigPageClient } from './(components)/ConfigPageClient';
import { ArrowLeftIcon } from 'lucide-react';
export default async function ProfessionalConfigPage() {
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
                <div className="max-w-3xl mx-auto space-y-6">
                    <header className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">
                                Configuración del Profesional
                            </h1>
                            <p className="text-slate-500 mt-1">
                                Perfil, especialidad y coberturas aceptadas
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

                    <ConfigPageClient initialLocations={locations} />
                </div>
            </main>
        </ProfessionalPortalGuard>
    );
}
