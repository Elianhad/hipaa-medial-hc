"use client";

import { useEffect, useState } from 'react';
import { getProfessionalConfig, patchProfessionalConfig } from '@/lib/professional-api';

const WEEK_SCHEDULE = [
    { day: 'Lunes', from: '08:30', to: '16:00' },
    { day: 'Martes', from: '08:30', to: '16:00' },
    { day: 'Miércoles', from: '10:00', to: '18:00' },
    { day: 'Jueves', from: '08:30', to: '16:00' },
    { day: 'Viernes', from: '08:30', to: '13:30' },
];

export default function ProfessionalAgendaPage() {
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [duration, setDuration] = useState('30');
    const [urgentBlock, setUrgentBlock] = useState('1');
    const [breakMinutes, setBreakMinutes] = useState('5');
    const [bookingNoticeHours, setBookingNoticeHours] = useState('24');

    useEffect(() => {
        const loadConfig = async () => {
            try {
                const config = await getProfessionalConfig();
                const rules = (config.appointmentRules ?? {}) as Record<string, string>;
                setDuration(rules.duration ?? '30');
                setUrgentBlock(rules.urgentBlock ?? '1');
                setBreakMinutes(rules.breakMinutes ?? '5');
                setBookingNoticeHours(rules.bookingNoticeHours ?? '24');
            } catch (_error) {
                setStatusMessage('Modo demo activo: la configuración se guardará localmente hasta habilitar API autenticada.');
            }
        };

        void loadConfig();
    }, []);

    const handleSave = async () => {
        const weeklySchedule = WEEK_SCHEDULE.reduce<Record<string, { from: string; to: string }>>((acc, slot) => {
            acc[slot.day] = { from: slot.from, to: slot.to };
            return acc;
        }, {});

        try {
            await patchProfessionalConfig({
                weeklySchedule,
                appointmentRules: {
                    duration,
                    urgentBlock,
                    breakMinutes,
                    bookingNoticeHours,
                },
            });
            setStatusMessage('Configuración de agenda guardada en backend.');
        } catch (_error) {
            setStatusMessage('No se pudo guardar en backend. Tu configuración quedó en modo demo local.');
        }
    };

    return (
        <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-lime-50 to-teal-50 py-10 px-4">
            <div className="max-w-5xl mx-auto space-y-6">
                <header className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Configuración de Agenda</h1>
                        <p className="text-slate-500 mt-1">Definí horarios de atención, duración y pausas.</p>
                    </div>
                    <a href="/dashboard/professional" className="text-sm text-emerald-700 hover:underline">← Portal profesional</a>
                </header>

                {statusMessage && (
                    <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                        {statusMessage}
                    </section>
                )}

                <section className="rounded-xl p-6 shadow-sm border border-emerald-200 bg-white/90 space-y-5">
                    <h2 className="text-lg font-semibold text-slate-900">Disponibilidad semanal</h2>
                    <div className="space-y-3">
                        {WEEK_SCHEDULE.map((slot) => (
                            <div key={slot.day} className="grid gap-3 rounded-lg border border-emerald-200 p-4 md:grid-cols-[130px_1fr_1fr_auto] md:items-center bg-white/70">
                                <p className="text-sm font-medium text-slate-800">{slot.day}</p>
                                <label className="text-xs text-slate-500">
                                    Desde
                                    <input defaultValue={slot.from} type="time" className="mt-1 w-full rounded-md border border-emerald-300 px-3 py-2 text-sm text-slate-700" />
                                </label>
                                <label className="text-xs text-slate-500">
                                    Hasta
                                    <input defaultValue={slot.to} type="time" className="mt-1 w-full rounded-md border border-emerald-300 px-3 py-2 text-sm text-slate-700" />
                                </label>
                                <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                                    <input defaultChecked type="checkbox" className="rounded border-emerald-300" />
                                    Atender
                                </label>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="rounded-xl p-6 shadow-sm border border-emerald-200 bg-white/90">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">Reglas de turnos</h2>
                    <div className="grid gap-4 md:grid-cols-2">
                        <label className="text-sm text-slate-600">
                            Duración de consulta
                            <select className="mt-1 w-full rounded-md border border-emerald-300 px-3 py-2 text-sm text-slate-700" value={duration} onChange={(event) => setDuration(event.target.value)}>
                                <option value="15">15 minutos</option>
                                <option value="20">20 minutos</option>
                                <option value="30">30 minutos</option>
                                <option value="45">45 minutos</option>
                            </select>
                        </label>
                        <label className="text-sm text-slate-600">
                            Bloque para urgencias
                            <select className="mt-1 w-full rounded-md border border-emerald-300 px-3 py-2 text-sm text-slate-700" value={urgentBlock} onChange={(event) => setUrgentBlock(event.target.value)}>
                                <option value="0">Sin bloque</option>
                                <option value="1">1 turno por jornada</option>
                                <option value="2">2 turnos por jornada</option>
                            </select>
                        </label>
                        <label className="text-sm text-slate-600">
                            Pausa entre consultas
                            <select className="mt-1 w-full rounded-md border border-emerald-300 px-3 py-2 text-sm text-slate-700" value={breakMinutes} onChange={(event) => setBreakMinutes(event.target.value)}>
                                <option value="0">Sin pausa</option>
                                <option value="5">5 minutos</option>
                                <option value="10">10 minutos</option>
                            </select>
                        </label>
                        <label className="text-sm text-slate-600">
                            Anticipación mínima de reserva
                            <select className="mt-1 w-full rounded-md border border-emerald-300 px-3 py-2 text-sm text-slate-700" value={bookingNoticeHours} onChange={(event) => setBookingNoticeHours(event.target.value)}>
                                <option value="1">1 hora</option>
                                <option value="6">6 horas</option>
                                <option value="24">24 horas</option>
                            </select>
                        </label>
                    </div>
                    <button onClick={() => void handleSave()} className="mt-6 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700">
                        Guardar configuración
                    </button>
                </section>
            </div>
        </main>
    );
}
