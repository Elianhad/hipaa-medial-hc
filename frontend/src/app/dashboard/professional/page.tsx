'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ProfessionalPortalGuard } from '../../../components/ProfessionalPortalGuard';
import {
  getProfessionalTodayBoardAuto,
  patchAppointmentAttendance,
} from '@/app/actions/professionals';
import { AppointmentAttendanceApi } from '@/app/actions/professional-action-types';
import { PatientRegistrationForm } from '@/components/forms/PatientRegistrationForm';
import { CalendarIcon, UserIcon, UsersIcon } from 'lucide-react';

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

const statusStyles: Record<AttendanceStatus, string> = {
  pendiente: 'border border-amber-200 bg-amber-50 text-amber-800',
  presente: 'border border-emerald-200 bg-emerald-50 text-emerald-800',
  ausente: 'border border-rose-200 bg-rose-50 text-rose-800',
};

export default function ProfessionalDashboardPage() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<TodayAppointment[]>([]);
  const [isLoadingBoard, setIsLoadingBoard] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isApiConnected, setIsApiConnected] = useState(false);
  const [showWalkInModal, setShowWalkInModal] = useState(false);

  useEffect(() => {
    const loadBoard = async () => {
      try {
        const board = await getProfessionalTodayBoardAuto();
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
        setAppointments([]);
        setStatusMessage('No se pudo cargar la agenda real desde backend. Verifica autenticación y conexión API.');
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
      <main className="min-h-screen py-8 px-4 sm:py-10">
        <div className="mx-auto max-w-6xl space-y-8">
          <header className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Panel clínico diario</p>
                <h1 className="mt-3 text-[clamp(2rem,4vw,2.75rem)] font-bold leading-tight text-slate-900">Portal del Profesional</h1>
                <p className="mt-2 text-slate-600">
                  Gestioná consultas, asistencia y preparación clínica en una sola vista.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
                  <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sky-700">Agenda del día</span>
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">Seguimiento clínico</span>
                  <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-violet-700">
                    {isApiConnected ? 'Sincronización activa' : 'Modo local'}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 lg:justify-end">
                <button
                  onClick={() => setShowWalkInModal(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Alta de paciente
                  {
                    /* agrega Icono de una persona */

                  }
                  <UserIcon className="h-4 w-4" />
                </button>
                <Link
                  href="/dashboard/professional/pacientes"
                  className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-400"
                >
                  Pacientes
                  <UsersIcon className="h-4 w-4" />                  
                </Link>
                <Link
                  href="/dashboard/professional/agenda"
                  className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-400"
                >
                  Agenda
                  <CalendarIcon className="h-4 w-4" />
                </Link>
                <Link
                  href="/dashboard/professional/profile"
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-400"
                >
                  Perfil
                </Link>
              </div>
            </div>
          </header>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <article className="rounded-2xl border border-sky-200 bg-sky-50/70 p-5 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-sky-800">Citas del día</p>
              <p className="mt-3 text-3xl font-bold leading-none text-slate-900">{appointments.length}</p>
            </article>
            <article className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-800">Presentes</p>
              <p className="mt-3 text-3xl font-bold leading-none text-emerald-600">{adherence.attended}</p>
            </article>
            <article className="rounded-2xl border border-rose-200 bg-rose-50/70 p-5 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-rose-800">Ausentes</p>
              <p className="mt-3 text-3xl font-bold leading-none text-rose-600">{adherence.absent}</p>
            </article>
            <article className="rounded-2xl border border-violet-200 bg-violet-50/70 p-5 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-violet-800">Adherencia</p>
              <p className="mt-3 text-3xl font-bold leading-none text-slate-900">{adherence.percentage}%</p>
            </article>
          </section>

          {isLoadingBoard && (
            <section className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              Cargando agenda del día...
            </section>
          )}

          {statusMessage && (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              {statusMessage}
            </section>
          )}

          <section className="rounded-3xl border border-sky-200 bg-white shadow-sm overflow-hidden">
            <div className="flex flex-col gap-2 border-b border-sky-200 bg-sky-50/40 px-6 py-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Agenda de hoy</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Revisá al paciente antes de llamarlo y actualizá su estado de asistencia.
                </p>
              </div>
              <p className="text-sm text-slate-500">{appointments.length} citas registradas</p>
            </div>
            <div className="divide-y divide-slate-100">
              {appointments.length === 0 && !isLoadingBoard && (
                <article className="px-6 py-6 text-sm text-slate-600">
                  No hay citas para mostrar o la agenda no pudo sincronizarse.
                </article>
              )}
              {appointments.map((appointment) => (
                <article key={appointment.id} className="px-6 py-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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
                        className="ml-2 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
                      >
                        <option value="pendiente">Pendiente</option>
                        <option value="presente">Presente</option>
                        <option value="ausente">Ausente</option>
                      </select>
                    </label>
                    <Link
                      href={`/dashboard/professional/pacientes/${appointment.patientId}`}
                      className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-medium text-white hover:bg-slate-700"
                    >
                      Revisar paciente
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <footer className="border-t border-slate-200 pt-6 text-sm text-slate-500">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p>HEED · Portal del Profesional</p>
              <p>Vista diaria de atencion y seguimiento clinico</p>
            </div>
          </footer>
        </div>
      </main>

      {showWalkInModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowWalkInModal(false); }}
        >
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-slate-50 shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl bg-white/90 backdrop-blur border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="font-semibold text-slate-800">Alta espontánea</h2>
                <p className="text-xs text-slate-500 mt-0.5">Registre un paciente que se presenta sin turno previo</p>
              </div>
              <button
                onClick={() => setShowWalkInModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl leading-none"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
            <div className="p-2">
              <PatientRegistrationForm
                onSuccess={(patientId) => {
                  setShowWalkInModal(false);
                  router.push(`/dashboard/professional/pacientes/${patientId}`);
                }}
              />
            </div>
          </div>
        </div>
      )}
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
