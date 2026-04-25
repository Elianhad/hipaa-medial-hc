'use client';

import { useState, useCallback, useEffect } from 'react';
import { updateProfessionalLocationAuto } from '@/app/actions/professionals';
import type { ProfessionalLocation } from '@/app/actions/professional-action-types';
import { TrashIcon, Clock, CalendarDays, Plus, Save, Loader2 } from 'lucide-react';

const DAYS_OF_WEEK = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

// Mapeos para el backend y frontend
const DAY_TO_NUMBER: Record<string, number> = {
    'Domingo': 0, 'Lunes': 1, 'Martes': 2, 'Miércoles': 3, 'Jueves': 4, 'Viernes': 5, 'Sábado': 6
};
const NUMBER_TO_DAY: Record<number, string> = {
    0: 'Domingo', 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado'
};

interface ScheduleAgenda {
    id: string;
    days: string[];
    startTime: string;
    endTime: string;
}

interface AgendaFormProps {
    location: ProfessionalLocation;
    onUpdate: (location: ProfessionalLocation) => void;
}

export function AgendaForm({ location, onUpdate }: AgendaFormProps) {
    const [statusMessage, setStatusMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // --- ESTADOS DEL FORMULARIO ---
    const [slotDurationMinutes, setSlotDurationMinutes] = useState('30');
    const [paddingMinutes, setPaddingMinutes] = useState('5');
    const [maxAdvanceBookingDays, setMaxAdvanceBookingDays] = useState('30');
    const [agendas, setAgendas] = useState<ScheduleAgenda[]>([]);

    const [newAgenda, setNewAgenda] = useState<{ days: string[], startTime: string, endTime: string }>({
        days: [],
        startTime: '09:00',
        endTime: '13:00'
    });

    // 🚀 MAGIA INVERSA: Esto hace que el formulario cambie cuando seleccionas otra locación
    useEffect(() => {
        // 1. Cargar las reglas de la cita
        setSlotDurationMinutes((location.appointmentRules?.slotDurationMinutes as number)?.toString() || '30');
        setPaddingMinutes((location.appointmentRules?.paddingMinutes as number)?.toString() || '5');
        setMaxAdvanceBookingDays((location.appointmentRules?.maxAdvanceBookingDays as number)?.toString() || '30');

        // 2. Reconstruir los bloques visuales a partir del Array del backend
        const scheduleArray = (location.weeklySchedule as Array<{ dayOfWeek: number, startTime: string, endTime: string }>) || [];

        // Agrupamos los días que tienen el mismo horario de inicio y fin
        const groupedAgendas: Record<string, ScheduleAgenda> = {};

        scheduleArray.forEach(slot => {
            const key = `${slot.startTime}-${slot.endTime}`; // Ej: "09:00-13:00"

            if (!groupedAgendas[key]) {
                groupedAgendas[key] = {
                    id: crypto.randomUUID(),
                    days: [],
                    startTime: slot.startTime,
                    endTime: slot.endTime
                };
            }

            const dayName = NUMBER_TO_DAY[slot.dayOfWeek];
            if (dayName && !groupedAgendas[key].days.includes(dayName)) {
                groupedAgendas[key].days.push(dayName);
            }
        });

        // Actualizamos la vista con los datos ya ordenados
        setAgendas(Object.values(groupedAgendas));
        setStatusMessage(null); // Limpiar mensajes de error/éxito anteriores
        setNewAgenda({ days: [], startTime: '09:00', endTime: '13:00' }); // Resetear el form de agregar
    }, [location]); // <-- Este array de dependencias es clave. Se ejecuta cada vez que cambia 'location'

    const toggleDay = (day: string) => {
        setNewAgenda(prev => ({
            ...prev,
            days: prev.days.includes(day)
                ? prev.days.filter(d => d !== day)
                : [...prev.days, day]
        }));
    };

    const addAgendaBlock = () => {
        if (newAgenda.days.length === 0) {
            setStatusMessage({ type: 'error', text: 'Selecciona al menos un día.' });
            return;
        }
        if (newAgenda.startTime >= newAgenda.endTime) {
            setStatusMessage({ type: 'error', text: 'La hora de inicio debe ser anterior a la de fin.' });
            return;
        }

        setAgendas([...agendas, { ...newAgenda, id: crypto.randomUUID() }]);
        setNewAgenda({ days: [], startTime: '09:00', endTime: '13:00' });
        setStatusMessage(null);
    };

    const removeAgendaBlock = (id: string) => {
        setAgendas(agendas.filter(a => a.id !== id));
    };

    const handleSave = async () => {
        setIsLoading(true);
        setStatusMessage(null);

        try {
            const weeklyScheduleBackend: Array<{ dayOfWeek: number, startTime: string, endTime: string }> = [];

            agendas.forEach(agenda => {
                agenda.days.forEach(dayName => {
                    weeklyScheduleBackend.push({
                        dayOfWeek: DAY_TO_NUMBER[dayName],
                        startTime: agenda.startTime,
                        endTime: agenda.endTime
                    });
                });
            });

            const appointmentRulesBackend = {
                slotDurationMinutes: parseInt(slotDurationMinutes, 10),
                paddingMinutes: parseInt(paddingMinutes, 10),
                maxAdvanceBookingDays: parseInt(maxAdvanceBookingDays, 10)
            };

            const updatedLocation = await updateProfessionalLocationAuto(location.id, {
                weeklySchedule: weeklyScheduleBackend,
                appointmentRules: appointmentRulesBackend
            });

            onUpdate(updatedLocation);
            setStatusMessage({ type: 'success', text: 'Agenda guardada correctamente.' });
            setTimeout(() => setStatusMessage(null), 3000);

        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Error al guardar la agenda.';
            setStatusMessage({ type: 'error', text: msg });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-8">
            <div className="border-b pb-4">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-emerald-600" />
                    Configuración de Agenda: {location.name}
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                    Define la duración de tus turnos y los bloques horarios en los que atiendes aquí.
                </p>
            </div>

            {/* --- REGLAS DE TURNOS --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Duración del turno (min)</label>
                    <input
                        type="number"
                        min="5"
                        value={slotDurationMinutes}
                        onChange={(e) => setSlotDurationMinutes(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Descanso entre turnos (min)</label>
                    <input
                        type="number"
                        min="0"
                        value={paddingMinutes}
                        onChange={(e) => setPaddingMinutes(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Agendar con anticipación (días)</label>
                    <input
                        type="number"
                        min="1"
                        value={maxAdvanceBookingDays}
                        onChange={(e) => setMaxAdvanceBookingDays(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                </div>
            </div>

            {/* --- BLOQUES DE HORARIOS --- */}
            <div className="space-y-4">
                <h3 className="font-medium text-slate-900 flex items-center gap-2 border-t pt-6">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    Bloques de Atención
                </h3>

                {agendas.length > 0 && (
                    <div className="space-y-2 mb-4">
                        {agendas.map(agenda => (
                            <div key={agenda.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                                <div>
                                    <p className="font-medium text-sm text-slate-800">
                                        {agenda.days.join(', ')}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        De {agenda.startTime} a {agenda.endTime}
                                    </p>
                                </div>
                                <button onClick={() => removeAgendaBlock(agenda.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-xl space-y-4">
                    <p className="text-sm font-medium text-emerald-800">Agregar nuevo bloque</p>

                    <div className="flex flex-wrap gap-2">
                        {DAYS_OF_WEEK.map(day => (
                            <button
                                key={day}
                                onClick={() => toggleDay(day)}
                                className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${newAgenda.days.includes(day)
                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                    : 'bg-white text-slate-600 border-slate-300 hover:border-emerald-400'
                                    }`}
                            >
                                {day}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-end gap-4">
                        <div className="flex-1">
                            <label className="block text-xs font-medium text-slate-600 mb-1">Hora Inicio</label>
                            <input
                                type="time"
                                value={newAgenda.startTime}
                                onChange={(e) => setNewAgenda({ ...newAgenda, startTime: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-emerald-500"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-medium text-slate-600 mb-1">Hora Fin</label>
                            <input
                                type="time"
                                value={newAgenda.endTime}
                                onChange={(e) => setNewAgenda({ ...newAgenda, endTime: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-emerald-500"
                            />
                        </div>
                        <button
                            onClick={addAgendaBlock}
                            className="px-4 py-2 bg-slate-800 text-white text-sm rounded-lg font-medium hover:bg-slate-900 transition-colors flex items-center gap-1"
                        >
                            <Plus className="w-4 h-4" /> Agregar
                        </button>
                    </div>
                </div>
            </div>

            {statusMessage && (
                <div className={`p-3 rounded-lg text-sm ${statusMessage.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}`}>
                    {statusMessage.text}
                </div>
            )}

            <button
                onClick={handleSave}
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-60 transition-colors shadow-sm"
            >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {isLoading ? 'Guardando...' : 'Guardar Configuración en la Nube'}
            </button>
        </section>
    );
}