import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Appointment, AppointmentStatus } from './appointment.entity';
import { Patient } from '../patients/patient.entity';
import {
    AppointmentAttendance,
    UpdateAppointmentAttendanceDto,
} from './dto/update-appointment-attendance.dto';

export interface DashboardAppointment {
    id: string;
    patientId: string;
    patientName: string;
    scheduledAt: Date;
    reason: string | null;
    durationMinutes: number;
    appointmentStatus: AppointmentStatus;
    attendance: AppointmentAttendance;
}

@Injectable()
export class AppointmentsService {
    constructor(
        @InjectRepository(Appointment)
        private readonly appointmentRepo: Repository<Appointment>,
        @InjectRepository(Patient)
        private readonly patientRepo: Repository<Patient>,
    ) { }

    async getTodayByProfessional(professionalId: string, tenantId?: string, date?: string) {
        const targetDate = date ? new Date(`${date}T00:00:00.000Z`) : new Date();
        const start = new Date(targetDate);
        start.setUTCHours(0, 0, 0, 0);

        const end = new Date(targetDate);
        end.setUTCHours(23, 59, 59, 999);

        const qb = this.appointmentRepo
            .createQueryBuilder('appointment')
            .where('appointment.professional_id = :professionalId', { professionalId })
            .andWhere('appointment.scheduled_at BETWEEN :start AND :end', { start, end })
            .orderBy('appointment.scheduled_at', 'ASC');

        if (tenantId) {
            qb.andWhere('appointment.tenant_id = :tenantId', { tenantId });
        }

        const appointments = await qb.getMany();

        const patientIds = [...new Set(appointments.map((item) => item.patientId))];
        const patients = patientIds.length
            ? await this.patientRepo.findBy({ id: In(patientIds) })
            : [];

        const patientById = new Map(
            patients.map((patient) => [patient.id, `${patient.firstName} ${patient.lastName}`]),
        );

        const items: DashboardAppointment[] = appointments.map((appointment) => ({
            id: appointment.id,
            patientId: appointment.patientId,
            patientName: patientById.get(appointment.patientId) ?? 'Paciente',
            scheduledAt: appointment.scheduledAt,
            reason: appointment.reason,
            durationMinutes: appointment.durationMinutes,
            appointmentStatus: appointment.status,
            attendance: this.toAttendance(appointment.status),
        }));

        const attended = items.filter((item) => item.attendance === AppointmentAttendance.PRESENT).length;
        const absent = items.filter((item) => item.attendance === AppointmentAttendance.ABSENT).length;
        const closed = attended + absent;

        return {
            date: start.toISOString().slice(0, 10),
            summary: {
                total: items.length,
                attended,
                absent,
                closed,
                adherencePercentage: closed > 0 ? Math.round((attended / closed) * 100) : 0,
            },
            items,
        };
    }

    async updateAttendance(
        appointmentId: string,
        dto: UpdateAppointmentAttendanceDto,
        tenantId?: string,
    ) {
        const where: Record<string, string> = { id: appointmentId };
        if (tenantId) {
            where.tenantId = tenantId;
        }

        const appointment = await this.appointmentRepo.findOne({ where });
        if (!appointment) {
            throw new NotFoundException(`Turno ${appointmentId} no encontrado`);
        }

        appointment.status = this.fromAttendance(dto.attendance);
        const updated = await this.appointmentRepo.save(appointment);

        return {
            id: updated.id,
            status: updated.status,
            attendance: this.toAttendance(updated.status),
            updatedAt: updated.updatedAt,
        };
    }

    private toAttendance(status: AppointmentStatus): AppointmentAttendance {
        if (status === AppointmentStatus.COMPLETED) {
            return AppointmentAttendance.PRESENT;
        }
        if (status === AppointmentStatus.NO_SHOW) {
            return AppointmentAttendance.ABSENT;
        }
        return AppointmentAttendance.PENDING;
    }

    private fromAttendance(attendance: AppointmentAttendance): AppointmentStatus {
        if (attendance === AppointmentAttendance.PRESENT) {
            return AppointmentStatus.COMPLETED;
        }
        if (attendance === AppointmentAttendance.ABSENT) {
            return AppointmentStatus.NO_SHOW;
        }
        return AppointmentStatus.SCHEDULED;
    }
}
