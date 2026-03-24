'use client';

import { useState, useCallback } from 'react';
import { ProfessionalLocation, updateProfessionalLocationAuto } from '@/app/actions/professionals';

const AVAILABLE_INSURANCES = ['OSDE', 'Swiss Medical', 'Galeno', 'IOMA', 'PAMI', 'Particular'];

interface ConfigFormProps {
    location: ProfessionalLocation;
    onUpdate: (location: ProfessionalLocation) => void;
}

export function ConfigForm({ location, onUpdate }: ConfigFormProps) {
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [specialty, setSpecialty] = useState('clinica-medica');
    const [bio, setBio] = useState(
        'Médico clínico con enfoque en seguimiento de pacientes crónicos y prevención cardiovascular.',
    );
    const [insurances, setInsurances] = useState<string[]>(AVAILABLE_INSURANCES.slice(0, 4));

    const insuranceSet = new Set(insurances);

    const toggleInsurance = useCallback((name: string) => {
        setInsurances((current) => {
            if (current.includes(name)) {
                return current.filter((item) => item !== name);
            }
            return [...current, name];
        });
    }, []);

    const handleSave = useCallback(async () => {
        setIsLoading(true);
        try {
            const updated = await updateProfessionalLocationAuto(location.id, {
                appointmentRules: {
                    ...location.appointmentRules,
                    specialty,
                    bio,
                    acceptedInsurances: insurances,
                },
            });
            onUpdate(updated);
            setStatusMessage('Configuración guardada en backend.');
        } catch (error: any) {
            setStatusMessage(error?.message ?? 'No se pudo guardar configuración en backend.');
        } finally {
            setIsLoading(false);
        }
    }, [location.id, location.appointmentRules, specialty, bio, insurances, onUpdate]);

    return (
        <section className="rounded-xl p-6 shadow-sm border border-emerald-200 bg-white/90 space-y-6">
            <div>
                <h2 className="font-semibold text-slate-800 mb-4">Datos del perfil</h2>
                <div className="grid gap-4 md:grid-cols-2">
                    <label className="text-sm text-slate-600">
                        Especialidad
                        <select
                            value={specialty}
                            onChange={(e) => setSpecialty(e.target.value)}
                            className="mt-1 w-full rounded-md border border-emerald-300 px-3 py-2 text-sm text-slate-700"
                        >
                            <option value="clinica-medica">Clínica Médica</option>
                            <option value="pediatria">Pediatría</option>
                            <option value="cardiologia">Cardiología</option>
                            <option value="dermatologia">Dermatología</option>
                            <option value="psicologia">Psicología</option>
                        </select>
                    </label>
                </div>
            </div>

            <div>
                <label className="text-sm text-slate-600 block">
                    Breve descripción profesional
                    <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        className="mt-1 w-full rounded-md border border-emerald-300 px-3 py-2 text-sm text-slate-700"
                        rows={3}
                        placeholder="Cuéntanos sobre tu experiencia y enfoque clínico"
                    />
                </label>
            </div>

            <div>
                <h3 className="font-semibold text-slate-800 mb-3">Coberturas que aceptas</h3>
                <div className="grid gap-2 md:grid-cols-2">
                    {AVAILABLE_INSURANCES.map((name) => (
                        <label key={name} className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={insuranceSet.has(name)}
                                onChange={() => toggleInsurance(name)}
                                className="rounded border-emerald-300"
                            />
                            <span className="text-sm text-slate-700">{name}</span>
                        </label>
                    ))}
                </div>
            </div>

            {statusMessage && (
                <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    {statusMessage}
                </section>
            )}

            <button
                onClick={handleSave}
                disabled={isLoading}
                className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 disabled:bg-gray-400"
            >
                {isLoading ? 'Guardando...' : 'Guardar configuración'}
            </button>
        </section>
    );
}
