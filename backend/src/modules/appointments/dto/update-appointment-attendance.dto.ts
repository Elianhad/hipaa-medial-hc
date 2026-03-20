import { IsEnum } from 'class-validator';

export enum AppointmentAttendance {
    PENDING = 'pending',
    PRESENT = 'present',
    ABSENT = 'absent',
}

export class UpdateAppointmentAttendanceDto {
    @IsEnum(AppointmentAttendance)
    attendance: AppointmentAttendance;
}
