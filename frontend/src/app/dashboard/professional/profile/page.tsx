import { getProfessionalConfigAuto } from '@/app/actions/professionals';
import { ProfessionalPortalGuard } from '@/components/ProfessionalPortalGuard';
import { ProfessionalProfileForm } from './(components)/ProfessionalProfileForm';
import { ArrowLeftIcon } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';


export default async function ProfessionalProfilePage() {
    const profileData = await getProfessionalConfigAuto();
    const initialData = {
        specialty: profileData?.specialty || 'Clinica Medica',
        bio: profileData?.bio || '',
        licenseNumber: profileData?.licenseNumber || '',
        consultationFee: profileData?.consultationFee || 0,
        insurances: profileData?.insurances || [],
    };

    return (
        <ProfessionalPortalGuard>
            <main className="min-h-screen py-8 px-4 sm:py-10">
                <div className="mx-auto max-w-4xl space-y-8">

                    <header className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm sm:p-8">
                        <div className="flex flex-wrap items-end justify-between gap-4">
                            <div className="max-w-2xl">
                                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Panel clinico diario</p>
                                <h1 className="mt-3 text-[clamp(2rem,4vw,2.75rem)] font-bold leading-tight text-slate-900">
                                    Mi Perfil Profesional
                                </h1>
                                <p className="text-slate-600 mt-2">
                                    Configura tu identidad medica, credenciales y honorarios con una presentacion consistente.
                                </p>
                            </div>
                            <Link
                                href="/dashboard/professional"
                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-400"
                            >
                                <ArrowLeftIcon className="h-4 w-4" /> Volver al panel
                            </Link>
                        </div>
                    </header>

                    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                        <Suspense fallback={<div className="p-4 text-sm text-slate-500">Cargando perfil...</div>}>
                            <ProfessionalProfileForm initialData={initialData} />
                        </Suspense>
                    </section>

                    <footer className="border-t border-slate-200 pt-6 text-sm text-slate-500">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <p>HEED · Portal del Profesional</p>
                            <p>Identidad medica, cobertura y parametros de atencion</p>
                        </div>
                    </footer>
                </div>
            </main>
        </ProfessionalPortalGuard>
    );
}