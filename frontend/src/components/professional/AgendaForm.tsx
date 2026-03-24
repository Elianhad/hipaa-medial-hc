'use client';

import { useState, useCallback } from 'react';
import { ProfessionalLocation, updateProfessionalLocationAuto } from '@/app/actions/professionals';

const WEEK_SCHEDULE = [
    { day: 'Lunes', from: '08:30', to: '16:00' },
    { day: 'Martes', from: '08:30', to: '16:00' },
    { day: 'Miércoles', from: '10:00', to: '18:00' },
    { day: 'Jueves', from: '08:30', to: '16:00' },
    { day: 'Viernes', from: '08:30', to: '13:30' },
];

interface AgendaFormProps {
    location: ProfessionalLocation;
    onUpdate: (location: ProfessionalLocation) => void;
}

export function AgendaForm({ location, onUpdate }: AgendaFormProps) {
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [duration, setDuration] = useState(
        ((location.appointmentRules?.duration as string) ?? '30')
    );
    const [urgentBlock, setUrgentBlock] = useState(
        ((location.appointmentRules?.urgentBlock as string) ?? '1')
    );
    const [breakMinutes, setBreakMinutes] = useState(
        ((location.appointmentRules?.breakMinutes as string) ?? '5')
    );
    const [bookingNoticeHours, setBookingNoticeHours] = useState(
        ((location.appointmentRules?.bookingNoticeHours as string) ?? '24')
    );

    const handleSave = useCallback(async () => {
        setIsLoading(true);
        const weeklySchedule = WEEK_SCHEDULE.reduce<
            Record<string, { from: string; to: string }>
        >((acc, slot) => {
            acc[slot.day] = { from: slot.from, to: slot.to };
            return acc;
        }, {});

        try {
            const updated = await updateProfessionalLocationAuto(location.id, {
                weeklySchedule,
                appointmentRules: {
                    duration,
                    urgentBlock,
                    breakMinutes,
                    bookingNoticeHours,
                },
            });
            onUpdate(updated);
            setStatusMessage('Configuración de agenda guardada en backend.');
        } catch (error: any) {
            setStatusMessage(
                error?.message ?? 'No se pudo guardar configuración en backend.',
            );
        } finally {
            setIsLoading(false);
        }
    }, [location.id, duration, urgentBlock, breakMinutes, bookingNoticeHours, onUpdate]);

    return (
        <section className="rounded-xl p-6 shadow-sm border border-emerald-200 bg-white/90 space-y-5">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">
                    Disponibilidad en: <span className="text-emerald-700">{location.name}</span>
                </h2>
                {location.address && (
                    <p className="text-sm text-slate-500">{location.address}</p>
                )}
            </div>

            <div className="space-y-3">
                <h3 className="font-semibold text-slate-800">Duración de consultas</h3>
                <label className="flex items-center gap-2">
                    <input
                        type="number"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        className="w-20 px-2 py-1 border border-slate-300 rounded"
                        min="15"
                        step="15"
                    />
                    <span className="text-sm text-slate-600">minutos</span>
                </label>
            </div>

            <div className="space-y-3">
                <h3 className="font-semibold text-slate-800">Bloques de atención urgente</h3>
                <label className="flex items-center gap-2">
                    <input
                        type="number"
                        value={urgentBlock}
                        onChange={(e) => setUrgentBlock(e.target.value)}
                        className="w-20 px-2 py-1 border border-slate-300 rounded"
                        min="0"
                        step="1"
                    />
                    <span className="text-sm text-slate-600">bloques por día</span>
                </label>
            </div>

            <div className="space-y-3">
                <h3 className="font-semibold text-slate-800">Pausa entre consultas</h3>
                <label className="flex items-center gap-2">
                    <input
                        type="number"
                        value={breakMinutes}
                        onChange={(e) => setBreakMinutes(e.target.value)}
                        className="w-20 px-2 py-1 border border-slate-300 rounded"
                        min="0"
                        step="1"
                    />
                    <span className="text-sm text-slate-600">minutos</span>
                </label>
            </div>

            <div className="space-y-3">
                <h3 className="font-semibold text-slate-800">Aviso previo para reservas</h3>
                <label className="flex items-center gap-2">
                    <input
                        type="number"
                        value={bookingNoticeHours}
                        onChange={(e) => setBookingNoticeHours(e.target.value)}
                        className="w-20 px-2 py-1 border border-slate-300 rounded"
                        min="0"
                        step="1"
                    />
                    <span className="text-sm text-slate-600">horas</span>
                </label>
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
