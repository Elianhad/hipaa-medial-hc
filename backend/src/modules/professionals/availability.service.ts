import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfessionalLocation } from './professional-location.entity';
import { ScheduleException } from './schedule-exception.entity';
import { Appointment, AppointmentStatus } from '../appointments/appointment.entity';

// ─── Internal types ──────────────────────────────────────────────────────────

interface WeeklyScheduleRule {
    dayOfWeek: number;   // 0 = Sunday … 6 = Saturday
    startTime: string;   // "HH:mm"
    endTime: string;     // "HH:mm"
}

interface NormalizedAppointmentRules {
    slotDurationMinutes: number;
    paddingMinutes: number;
}

// ─── Public response type ────────────────────────────────────────────────────

export interface DaySlots {
    date: string;    // "YYYY-MM-DD"
    slots: string[]; // ["09:00", "09:30", …]
}

// ─── Helpers (module-private, top-level for performance) ─────────────────────

const MAX_RANGE_DAYS = 60;

function parseTimeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
}

function minutesToTimeString(totalMinutes: number): string {
    const h = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
    const m = String(totalMinutes % 60).padStart(2, '0');
    return `${h}:${m}`;
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class AvailabilityService {
    constructor(
        @InjectRepository(ProfessionalLocation)
        private readonly locationRepo: Repository<ProfessionalLocation>,
        @InjectRepository(ScheduleException)
        private readonly exceptionRepo: Repository<ScheduleException>,
        @InjectRepository(Appointment)
        private readonly appointmentRepo: Repository<Appointment>,
    ) { }

    /**
     * Returns all available appointment slots for a professional at a given
     * location between startDate and endDate (both inclusive, YYYY-MM-DD).
     *
     * Logic:
     *  1. Load ProfessionalLocation → extract weeklySchedule + appointmentRules.
     *  2. Load ScheduleExceptions overlapping the range (global + location-scoped).
     *  3. Load active Appointments for the professional in the range.
     *  4. Iterate day-by-day, generate theoretical slots, subtract blocks.
     */
    async getAvailableSlots(
        professionalId: string,
        locationId: string,
        startDateStr: string,
        endDateStr: string,
    ): Promise<DaySlots[]> {
        // ── Guard: valid date range ──────────────────────────────────────────
        const rangeStart = new Date(`${startDateStr}T00:00:00.000Z`);
        const rangeEnd = new Date(`${endDateStr}T23:59:59.999Z`);

        if (Number.isNaN(rangeStart.getTime()) || Number.isNaN(rangeEnd.getTime())) {
            throw new BadRequestException('Invalid date format — use YYYY-MM-DD');
        }

        if (rangeEnd < rangeStart) {
            throw new BadRequestException('endDate must be on or after startDate');
        }

        const diffDays = Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / 86_400_000);
        if (diffDays > MAX_RANGE_DAYS) {
            throw new BadRequestException(`Date range cannot exceed ${MAX_RANGE_DAYS} days`);
        }

        // ── Load location with schedule rules ────────────────────────────────
        const location = await this.locationRepo.findOne({
            where: { id: locationId, professionalId, isActive: true },
        });

        if (!location) {
            throw new NotFoundException('Location not found or inactive');
        }

        const schedule = this.parseWeeklySchedule(location.weeklySchedule);
        if (!schedule.length) {
            return [];
        }

        const rules = this.parseAppointmentRules(location.appointmentRules);
        const step = rules.slotDurationMinutes + rules.paddingMinutes;

        if (rules.slotDurationMinutes <= 0) {
            throw new BadRequestException('Invalid appointment rules: slotDurationMinutes must be > 0');
        }

        // ── Fetch blocking data in parallel ──────────────────────────────────
        const [exceptions, appointments] = await Promise.all([
            this.loadExceptions(professionalId, locationId, rangeStart, rangeEnd),
            this.loadAppointments(professionalId, rangeStart, rangeEnd),
        ]);

        // Pre-compute appointment intervals once (avoid repeated arithmetic per slot)
        const appointmentIntervals = appointments.map((appt) => ({
            start: appt.scheduledAt.getTime(),
            end: appt.scheduledAt.getTime() + appt.durationMinutes * 60_000,
        }));

        // Pre-compute exception intervals once
        const exceptionIntervals = exceptions.map((ex) => ({
            start: ex.startDate.getTime(),
            end: ex.endDate.getTime(),
        }));

        // ── Iterate days ─────────────────────────────────────────────────────
        const result: DaySlots[] = [];
        const cursor = new Date(rangeStart);

        while (cursor.getTime() <= rangeEnd.getTime()) {
            const dayStr = cursor.toISOString().slice(0, 10);
            const dayOfWeek = cursor.getUTCDay();
            const dayStartMs = cursor.getTime();

            const rulesForDay = schedule.filter((r) => r.dayOfWeek === dayOfWeek);
            const daySlots: string[] = [];

            for (const rule of rulesForDay) {
                const startMins = parseTimeToMinutes(rule.startTime);
                const endMins = parseTimeToMinutes(rule.endTime);
                let offset = startMins;

                while (offset + rules.slotDurationMinutes <= endMins) {
                    const slotStartMs = dayStartMs + offset * 60_000;
                    const slotEndMs = slotStartMs + rules.slotDurationMinutes * 60_000;

                    // ── Filter 1: blocked by a schedule exception ────────────
                    const blockedByException = exceptionIntervals.some(
                        (ex) => ex.start < slotEndMs && ex.end > slotStartMs,
                    );

                    if (!blockedByException) {
                        // ── Filter 2: overlaps with an existing appointment ──
                        const blockedByAppointment = appointmentIntervals.some(
                            (appt) => appt.start < slotEndMs && appt.end > slotStartMs,
                        );

                        if (!blockedByAppointment) {
                            daySlots.push(minutesToTimeString(offset));
                        }
                    }

                    offset += step;
                }
            }

            if (daySlots.length > 0) {
                result.push({ date: dayStr, slots: daySlots });
            }

            cursor.setUTCDate(cursor.getUTCDate() + 1);
        }

        return result;
    }

    // ─── Private data loaders ─────────────────────────────────────────────────

    /**
     * Fetch schedule exceptions that overlap [rangeStart, rangeEnd].
     * Includes both location-specific exceptions AND global ones (location_id IS NULL).
     */
    private async loadExceptions(
        professionalId: string,
        locationId: string,
        rangeStart: Date,
        rangeEnd: Date,
    ): Promise<ScheduleException[]> {
        return this.exceptionRepo
            .createQueryBuilder('ex')
            .where('ex.professional_id = :professionalId', { professionalId })
            .andWhere('(ex.location_id = :locationId OR ex.location_id IS NULL)', { locationId })
            .andWhere('ex.start_date < :rangeEnd', { rangeEnd })
            .andWhere('ex.end_date > :rangeStart', { rangeStart })
            .getMany();
    }

    /**
     * Fetch non-cancelled, non-no_show appointments for the professional
     * whose scheduled_at falls within the range.
     * Note: Appointment entity does not store locationId — filtered by professionalId only.
     */
    private async loadAppointments(
        professionalId: string,
        rangeStart: Date,
        rangeEnd: Date,
    ): Promise<Appointment[]> {
        return this.appointmentRepo
            .createQueryBuilder('appt')
            .where('appt.professional_id = :professionalId', { professionalId })
            .andWhere('appt.status NOT IN (:...statuses)', {
                statuses: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
            })
            .andWhere('appt.scheduled_at >= :rangeStart', { rangeStart })
            .andWhere('appt.scheduled_at <= :rangeEnd', { rangeEnd })
            .getMany();
    }

    // ─── Private parsers (defensive, tolerates malformed JSONB) ──────────────

    private parseWeeklySchedule(raw: any[]): WeeklyScheduleRule[] {
        if (!Array.isArray(raw)) {
            return [];
        }

        return (raw as unknown[]).filter(
            (item): item is WeeklyScheduleRule =>
                typeof item === 'object' &&
                item !== null &&
                typeof (item as WeeklyScheduleRule).dayOfWeek === 'number' &&
                Number.isFinite((item as WeeklyScheduleRule).dayOfWeek) &&
                typeof (item as WeeklyScheduleRule).startTime === 'string' &&
                typeof (item as WeeklyScheduleRule).endTime === 'string',
        );
    }

    private parseAppointmentRules(raw: Record<string, unknown>): NormalizedAppointmentRules {
        const slotDurationMinutes =
            typeof raw?.slotDurationMinutes === 'number' && raw.slotDurationMinutes > 0
                ? raw.slotDurationMinutes
                : 30;

        const paddingMinutes =
            typeof raw?.paddingMinutes === 'number' && raw.paddingMinutes >= 0
                ? raw.paddingMinutes
                : 0;

        return { slotDurationMinutes, paddingMinutes };
    }
}
