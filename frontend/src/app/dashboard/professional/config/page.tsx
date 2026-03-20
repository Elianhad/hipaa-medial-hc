"use client";

import { useEffect, useMemo, useState } from 'react';
import { getProfessionalConfig, patchProfessionalConfig } from '@/lib/professional-api';

const AVAILABLE_INSURANCES = ['OSDE', 'Swiss Medical', 'Galeno', 'IOMA', 'PAMI', 'Particular'];

export default function ProfessionalConfigPage() {
    const [specialty, setSpecialty] = useState('clinica-medica');
    const [bio, setBio] = useState('Médico clínico con enfoque en seguimiento de pacientes crónicos y prevención cardiovascular.');
    const [insurances, setInsurances] = useState<string[]>(['OSDE', 'Swiss Medical', 'Galeno', 'PAMI']);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    useEffect(() => {
        const loadConfig = async () => {
            try {
                const config = await getProfessionalConfig();
                if (config.specialty) {
                    setSpecialty(config.specialty);
                }
                if (config.bio) {
                    setBio(config.bio);
                }
                if (Array.isArray(config.acceptedInsurances) && config.acceptedInsurances.length > 0) {
                    setInsurances(config.acceptedInsurances);
                }
            } catch (_error) {
                setStatusMessage('Modo demo activo: podés editar, y se sincronizará al habilitar API autenticada.');
            }
        };

        void loadConfig();
    }, []);

    const insuranceSet = useMemo(() => new Set(insurances), [insurances]);

    const toggleInsurance = (name: string) => {
        setInsurances((current) => {
            if (current.includes(name)) {
                return current.filter((item) => item !== name);
            }
            return [...current, name];
        });
    };

    const handleSave = async () => {
        try {
            await patchProfessionalConfig({
                specialty,
                bio,
                acceptedInsurances: insurances,
            });
            setStatusMessage('Configuración guardada en backend.');
        } catch (_error) {
            setStatusMessage('No se pudo guardar en backend. Cambios aplicados en modo demo local.');
        }
    };

    return (
        <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-lime-50 to-teal-50 py-10 px-4">
            <div className="max-w-3xl mx-auto space-y-6">
                <header className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Configuración del Profesional</h1>
                        <p className="text-slate-500 mt-1">Perfil, especialidad y coberturas aceptadas</p>
                    </div>
                    <a href="/dashboard/professional" className="text-sm text-emerald-700 hover:underline">← Portal profesional</a>
                </header>

                {statusMessage && (
                    <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                        {statusMessage}
                    </section>
                )}

                <section className="rounded-xl p-6 shadow-sm border border-emerald-200 bg-white/90">
                    <h2 className="font-semibold text-slate-800 mb-4">Datos del perfil</h2>
                    <div className="grid gap-4 md:grid-cols-2">
                        <label className="text-sm text-slate-600 md:col-span-2">
                            Foto de perfil
                            <input type="file" accept="image/*" className="mt-1 block w-full rounded-md border border-emerald-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-100 file:px-3 file:py-2 file:text-xs file:font-medium file:text-emerald-800" />
                            <span className="mt-1 block text-xs text-slate-500">La carga de imagen quedará conectada a Storage en el próximo paso.</span>
                        </label>
                        <label className="text-sm text-slate-600">
                            Nombre y apellido
                            <input defaultValue="Dr. Juan Fulano" className="mt-1 w-full rounded-md border border-emerald-300 px-3 py-2 text-sm text-slate-700" />
                        </label>
                        <label className="text-sm text-slate-600">
                            Matrícula
                            <input defaultValue="MN 123456" className="mt-1 w-full rounded-md border border-emerald-300 px-3 py-2 text-sm text-slate-700" />
                        </label>
                        <label className="text-sm text-slate-600 md:col-span-2">
                            Bio profesional breve
                            <textarea value={bio} onChange={(event) => setBio(event.target.value)} rows={3} className="mt-1 w-full rounded-md border border-emerald-300 px-3 py-2 text-sm text-slate-700" />
                        </label>
                    </div>
                </section>

                <section className="rounded-xl p-6 shadow-sm border border-emerald-200 bg-white/90">
                    <h2 className="font-semibold text-slate-800 mb-4">Especialidad y modalidad</h2>
                    <div className="grid gap-4 md:grid-cols-2">
                        <label className="text-sm text-slate-600">
                            Especialidad principal
                            <select value={specialty} onChange={(event) => setSpecialty(event.target.value)} className="mt-1 w-full rounded-md border border-emerald-300 px-3 py-2 text-sm text-slate-700">
                                <option value="clinica-medica">Clínica médica</option>
                                <option value="cardiologia">Cardiología</option>
                                <option value="pediatria">Pediatría</option>
                                <option value="medicina-familiar">Medicina familiar</option>
                            </select>
                        </label>
                        <label className="text-sm text-slate-600">
                            Subespecialidad (opcional)
                            <input defaultValue="Riesgo cardiovascular" className="mt-1 w-full rounded-md border border-emerald-300 px-3 py-2 text-sm text-slate-700" />
                        </label>
                        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                            <input type="checkbox" defaultChecked className="rounded border-emerald-300" />
                            Atención presencial
                        </label>
                        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                            <input type="checkbox" defaultChecked className="rounded border-emerald-300" />
                            Teleconsulta
                        </label>
                    </div>
                </section>

                <section className="rounded-xl p-6 shadow-sm border border-emerald-200 bg-white/90">
                    <h2 className="font-semibold text-slate-800 mb-4">Obras sociales permitidas</h2>
                    <div className="grid gap-2 sm:grid-cols-2">
                        {AVAILABLE_INSURANCES.map((insurance) => (
                            <label key={insurance} className="inline-flex items-center gap-2 text-sm text-slate-700">
                                <input
                                    type="checkbox"
                                    checked={insuranceSet.has(insurance)}
                                    onChange={() => toggleInsurance(insurance)}
                                    className="rounded border-emerald-300"
                                />
                                {insurance}
                            </label>
                        ))}
                    </div>
                    <button onClick={() => void handleSave()} className="mt-6 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700">
                        Guardar cambios
                    </button>
                </section>
            </div>
        </main>
    );
}
