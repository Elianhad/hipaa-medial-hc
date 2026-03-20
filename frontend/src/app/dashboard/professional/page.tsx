'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ProfessionalPortalGuard } from '../../../components/ProfessionalPortalGuard';
import {
  getProfessionalTodayBoard,
  patchAppointmentAttendance,
  type AppointmentAttendanceApi,
} from '@/lib/professional-api';

type AttendanceStatus = 'pendiente' | 'presente' | 'ausente';

interface TodayAppointment {
  id: string;
  patientId: string;
  patientName: string;
  age?: number;
  time: string;
  reason: string;
  insurance?: string;
  status: AttendanceStatus;
}

const INITIAL_APPOINTMENTS: TodayAppointment[] = [
  {
    id: 'apt-001',
    patientId: 'pat-ana-garcia',
    patientName: 'Ana García',
    age: 34,
    time: '09:00',
    reason: 'Control de HTA',
    insurance: 'OSDE 210',
    status: 'pendiente',
  },
  {
    id: 'apt-002',
    patientId: 'pat-carlos-perez',
    patientName: 'Carlos Pérez',
    age: 58,
    time: '09:30',
    reason: 'Seguimiento post alta',
    insurance: 'Swiss Medical',
    status: 'presente',
  },
  {
    id: 'apt-003',
    patientId: 'pat-lucia-mendez',
    patientName: 'Lucía Méndez',
    age: 42,
    time: '10:15',
    reason: 'Cefalea persistente',
    insurance: 'Galeno',
    status: 'ausente',
  },
  {
    id: 'apt-004',
    patientId: 'pat-pedro-fernandez',
    patientName: 'Pedro Fernández',
    age: 67,
    time: '11:00',
    reason: 'Diabetes tipo II - control',
    insurance: 'PAMI',
    status: 'pendiente',
  },
];

const statusStyles: Record<AttendanceStatus, string> = {
  pendiente: 'bg-amber-100 text-amber-800',
  presente: 'bg-emerald-100 text-emerald-800',
  ausente: 'bg-rose-100 text-rose-800',
};

export default function ProfessionalDashboardPage() {
  const [appointments, setAppointments] = useState(INITIAL_APPOINTMENTS);
  const [isLoadingBoard, setIsLoadingBoard] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isApiConnected, setIsApiConnected] = useState(false);

  useEffect(() => {
    const loadBoard = async () => {
      try {
        const board = await getProfessionalTodayBoard();
        const mapped: TodayAppointment[] = board.items.map((item) => ({
          id: item.id,
          patientId: item.patientId,
          patientName: item.patientName,
          time: new Date(item.scheduledAt).toLocaleTimeString('es-AR', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }),
          reason: item.reason ?? 'Consulta general',
          insurance: 'Cobertura no informada',
          status: fromApiAttendance(item.attendance),
        }));

        setAppointments(mapped);
        setIsApiConnected(true);
        setStatusMessage(null);
      } catch (_error) {
        setIsApiConnected(false);
        setStatusMessage('Mostrando datos demo. Al habilitar Auth0/API se sincroniza automáticamente.');
      } finally {
        setIsLoadingBoard(false);
      }
    };

    loadBoard();
  }, []);

  const adherence = useMemo(() => {
    const attended = appointments.filter((appointment) => appointment.status === 'presente').length;
    const absent = appointments.filter((appointment) => appointment.status === 'ausente').length;
    const closed = attended + absent;
    const percentage = closed > 0 ? Math.round((attended / closed) * 100) : 0;

    return { attended, absent, closed, percentage };
  }, [appointments]);

  const updateStatus = async (appointmentId: string, status: AttendanceStatus) => {
    const previous = appointments;
    setAppointments((current) =>
      current.map((appointment) =>
        appointment.id === appointmentId ? { ...appointment, status } : appointment,
      ),
    );

    if (!isApiConnected) {
      return;
    }

    try {
      await patchAppointmentAttendance(appointmentId, toApiAttendance(status));
    } catch (_error) {
      setAppointments(previous);
      setStatusMessage('No se pudo guardar el estado en backend. Se revirtió el cambio local.');
    }
  };

  return (
    <ProfessionalPortalGuard>
      <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-lime-50 to-teal-50 py-10 px-4">
        <div className="max-w-6xl mx-auto space-y-8">
          <header className="rounded-2xl border border-emerald-200 bg-white/85 backdrop-blur p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Portal del Profesional</h1>
                <p className="mt-1 text-slate-600">
                  Gestión diaria de consultas, asistencia y preparación clínica.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/dashboard/professional/agenda"
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  Configurar agenda
                </Link>
                <Link
                  href="/dashboard/professional/config"
                  className="rounded-lg border border-emerald-300 px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100"
                >
                  Configurar perfil
                </Link>
              </div>
            </div>
          </header>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <article className="rounded-xl border border-emerald-200 bg-white/90 p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Citas del día</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{appointments.length}</p>
            </article>
            <article className="rounded-xl border border-emerald-200 bg-white/90 p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Presentes</p>
              <p className="mt-2 text-2xl font-bold text-emerald-700">{adherence.attended}</p>
            </article>
            <article className="rounded-xl border border-emerald-200 bg-white/90 p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Ausentes</p>
              <p className="mt-2 text-2xl font-bold text-rose-700">{adherence.absent}</p>
            </article>
            <article className="rounded-xl border border-emerald-200 bg-white/90 p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Adherencia</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{adherence.percentage}%</p>
            </article>
          </section>

          {isLoadingBoard && (
            <section className="rounded-xl border border-emerald-200 bg-white/90 p-4 text-sm text-slate-600">
              Cargando agenda del día...
            </section>
          )}

          {statusMessage && (
            <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              {statusMessage}
            </section>
          )}

          <section className="rounded-2xl border border-emerald-200 bg-white/90 shadow-sm overflow-hidden">
            <div className="border-b border-emerald-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">Agenda de hoy</h2>
              <p className="text-sm text-slate-500">
                Revisá al paciente antes de llamarlo y actualizá su estado de asistencia.
              </p>
            </div>
            <div className="divide-y divide-emerald-100/70">
              {appointments.map((appointment) => (
                <article key={appointment.id} className="px-6 py-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-900">
                      {appointment.time} · {appointment.patientName} ({appointment.age})
                    </p>
                    <p className="text-sm text-slate-600">{appointment.reason}</p>
                    <p className="text-xs text-slate-500">Cobertura: {appointment.insurance ?? 'No informada'}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[appointment.status]}`}>
                      {appointment.status}
                    </span>
                    <label className="text-xs text-slate-600">
                      Estado
                      <select
                        value={appointment.status}
                        onChange={(event) => {
                          void updateStatus(appointment.id, event.target.value as AttendanceStatus);
                        }}
                        className="ml-2 rounded-md border border-emerald-300 bg-white px-2 py-1 text-xs text-slate-700"
                      >
                        <option value="pendiente">Pendiente</option>
                        <option value="presente">Presente</option>
                        <option value="ausente">Ausente</option>
                      </select>
                    </label>
                    <Link
                      href={`/dashboard/professional/pacientes/${appointment.patientId}`}
                      className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-800"
                    >
                      Revisar paciente
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </main>
    </ProfessionalPortalGuard>
  );
}

function fromApiAttendance(value: AppointmentAttendanceApi): AttendanceStatus {
  if (value === 'present') return 'presente';
  if (value === 'absent') return 'ausente';
  return 'pendiente';
}

function toApiAttendance(value: AttendanceStatus): AppointmentAttendanceApi {
  if (value === 'presente') return 'present';
  if (value === 'ausente') return 'absent';
  return 'pending';
}
