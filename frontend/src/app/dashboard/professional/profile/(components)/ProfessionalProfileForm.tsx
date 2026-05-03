'use client';

import { useState } from 'react';
import { patchProfessionalConfigAuto } from '@/app/actions/professionals';
import { Save, Loader2, User, FileBadge, CreditCard, CheckCircle2 } from 'lucide-react';

// Asumimos que recibes esta data inicial desde tu page.tsx
interface ProfessionalProfileProps {
    initialData: {
        specialty: string;
        bio: string;
        licenseNumber: string;
        consultationFee: number;
        insurances: string[];
    };
}

const AVAILABLE_INSURANCES = ['OSDE', 'Galeno', 'Swiss Medical', 'PAMI', 'IOMA'];

export function ProfessionalProfileForm({ initialData }: ProfessionalProfileProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const fieldClassName =
        'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100';

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setStatusMessage(null);

        const formData = new FormData(e.currentTarget);

        // Recopilamos las obras sociales seleccionadas (checkboxes múltiples)
        const selectedInsurances = AVAILABLE_INSURANCES.filter(
            ins => formData.get(`insurance_${ins}`) === 'on'
        );

        const payload = {
            specialty: formData.get('specialty') as string,
            bio: formData.get('bio') as string,
            licenseNumber: formData.get('licenseNumber') as string,
            consultationFee: Number(formData.get('consultationFee')),
            insurances: selectedInsurances,
        };

        try {
            await patchProfessionalConfigAuto(payload);
            setStatusMessage({ type: 'success', text: 'Perfil actualizado correctamente.' });
            setTimeout(() => setStatusMessage(null), 3000);
        } catch (error) {
            setStatusMessage({ type: 'error', text: error instanceof Error ? error.message : 'Error al guardar el perfil.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">

            {/* TARJETA 1: Información Pública */}
            <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
                <div className="flex items-center gap-2 border-b border-emerald-200 bg-emerald-50/70 px-6 py-4">
                    <User className="w-5 h-5 text-emerald-700" />
                    <h2 className="text-base font-semibold text-slate-800">Perfil Público</h2>
                </div>
                <div className="p-6 space-y-5">
                    {/* Fila: Avatar y Especialidad */}
                    <div className="flex flex-col md:flex-row gap-6">
                        <div className="flex flex-col items-center gap-2">
                            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-emerald-300 bg-emerald-50 text-emerald-600">
                                {/* Aquí iría un <Image /> de Next.js si tienes la foto */}
                                <User className="w-8 h-8 opacity-50" />
                            </div>
                            <button type="button" className="text-xs text-emerald-600 font-medium hover:underline">
                                Cambiar foto
                            </button>
                        </div>

                        <div className="flex-1 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Especialidad Principal *</label>
                                <select
                                    name="specialty"
                                    defaultValue={initialData.specialty}
                                    required
                                    className={fieldClassName}
                                >
                                    <option value="Clínica Médica">Clínica Médica</option>
                                    <option value="Cardiología">Cardiología</option>
                                    <option value="Pediatría">Pediatría</option>
                                    {/* ... más opciones ... */}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Breve presentación profesional</label>
                                <textarea
                                    name="bio"
                                    defaultValue={initialData.bio}
                                    rows={3}
                                    placeholder="Cuéntales a tus pacientes sobre tu experiencia y enfoque médico..."
                                    className={`${fieldClassName} resize-none`}
                                />
                                <p className="text-xs text-slate-500 mt-1">Esta información aparecerá en tu perfil visible para los pacientes.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* TARJETA 2: Credenciales y Facturación */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Columna Izquierda: Matrículas */}
                <section className="overflow-hidden rounded-2xl border border-violet-200 bg-white shadow-sm">
                    <div className="flex items-center gap-2 border-b border-violet-200 bg-violet-50/70 px-6 py-4">
                        <FileBadge className="w-5 h-5 text-violet-700" />
                        <h2 className="text-base font-semibold text-slate-800">Credenciales</h2>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Número de Matrícula (MN/MP) *</label>
                            <input
                                name="licenseNumber"
                                type="text"
                                required
                                defaultValue={initialData.licenseNumber}
                                placeholder="Ej: MN 123456"
                                className={fieldClassName}
                            />
                        </div>
                    </div>
                </section>

                {/* Columna Derecha: Honorarios Particulares */}
                <section className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">
                    <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50/70 px-6 py-4">
                        <CreditCard className="w-5 h-5 text-amber-700" />
                        <h2 className="text-base font-semibold text-slate-800">Honorarios Particulares</h2>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Valor de la consulta ($)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-slate-500">$</span>
                                <input
                                    name="consultationFee"
                                    type="number"
                                    min="0"
                                    step="1000"
                                    defaultValue={initialData.consultationFee}
                                    className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-8 pr-3 text-sm text-slate-700 shadow-sm transition focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100"
                                />
                            </div>
                            <p className="text-xs text-slate-500 mt-1">Este es el valor base si el paciente no cuenta con cobertura médica.</p>
                        </div>
                    </div>
                </section>
            </div>

            {/* TARJETA 3: Obras Sociales */}
            <section className="overflow-hidden rounded-2xl border border-sky-200 bg-white shadow-sm">
                <div className="border-b border-sky-200 bg-sky-50/70 px-6 py-4">
                    <h2 className="text-base font-semibold text-slate-800">Obras Sociales y Prepagas Aceptadas</h2>
                </div>
                <div className="p-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {AVAILABLE_INSURANCES.map((insurance) => (
                            <label key={insurance} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 transition-colors hover:bg-sky-50 has-[:checked]:border-sky-400 has-[:checked]:bg-sky-50/70">
                                <input
                                    type="checkbox"
                                    name={`insurance_${insurance}`}
                                    defaultChecked={initialData.insurances.includes(insurance)}
                                    className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                                />
                                <span className="text-sm font-medium text-slate-700">{insurance}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </section>

            {/* Feedbacks y Botón de Guardar */}
            {statusMessage && (
                <div className={`p-4 rounded-xl flex items-center gap-2 ${statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">{statusMessage.text}</span>
                </div>
            )}

            <div className="flex justify-end pt-4 border-t border-slate-200">
                <button
                    type="submit"
                    disabled={isLoading}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-60 transition-colors shadow-sm"
                >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Guardar Perfil Profesional
                </button>
            </div>
        </form>
    );
}