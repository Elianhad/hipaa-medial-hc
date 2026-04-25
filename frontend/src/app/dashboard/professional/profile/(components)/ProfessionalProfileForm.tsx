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
            <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-emerald-600" />
                    <h2 className="text-base font-semibold text-slate-800">Perfil Público</h2>
                </div>
                <div className="p-6 space-y-5">
                    {/* Fila: Avatar y Especialidad */}
                    <div className="flex flex-col md:flex-row gap-6">
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-24 h-24 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 overflow-hidden">
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
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
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
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
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
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center gap-2">
                        <FileBadge className="w-5 h-5 text-emerald-600" />
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
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                            />
                        </div>
                    </div>
                </section>

                {/* Columna Derecha: Honorarios Particulares */}
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-emerald-600" />
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
                                    className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                />
                            </div>
                            <p className="text-xs text-slate-500 mt-1">Este es el valor base si el paciente no cuenta con cobertura médica.</p>
                        </div>
                    </div>
                </section>
            </div>

            {/* TARJETA 3: Obras Sociales */}
            <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
                    <h2 className="text-base font-semibold text-slate-800">Obras Sociales y Prepagas Aceptadas</h2>
                </div>
                <div className="p-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {AVAILABLE_INSURANCES.map((insurance) => (
                            <label key={insurance} className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50/50">
                                <input
                                    type="checkbox"
                                    name={`insurance_${insurance}`}
                                    defaultChecked={initialData.insurances.includes(insurance)}
                                    className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
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
                    <CheckCircle2 className="w-5 h-5" />
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