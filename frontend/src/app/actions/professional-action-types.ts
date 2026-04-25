
/**
 * 3. INTERFACES Y TIPOS
 */
export interface ProfessionalBoardItem {
    id: string;
    patientId: string;
    patientName: string;
    scheduledAt: string;
    reason: string | null;
    durationMinutes: number;
    appointmentStatus: string;
    attendance: 'pending' | 'present' | 'absent';
}

export type AppointmentAttendanceApi = 'pending' | 'present' | 'absent';

export interface ProfessionalBoardResponse {
    date: string;
    summary: {
        total: number;
        attended: number;
        absent: number;
        closed: number;
        adherencePercentage: number;
    };
    items: ProfessionalBoardItem[];
}

export interface ProfessionalConfigResponse {
    id: string;
    specialty?: string;
    bio?: string;
    photoUrl?: string;
    consultationFee?: number;
    isPublic?: boolean;
    acceptedInsurances?: string[];
    weeklySchedule?: any[];
    appointmentRules?: Record<string, unknown>;
    licenseNumber: string;
    insurances?: string[];
}

export interface ProfessionalConfigPatch {
    specialty?: string;
    bio?: string;
    photoUrl?: string;
    consultationFee?: number;
    isPublic?: boolean;
    acceptedInsurances?: string[];
    weeklySchedule?: any[];
    appointmentRules?: Record<string, unknown>;
}

export interface ProfessionalLocation {
    id: string;
    professionalId: string;
    tenantId: string;
    name: string;
    address?: string;
    phone?: string;
    weeklySchedule: any[];
    appointmentRules: Record<string, unknown>;
    isMainLocation: boolean;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateLocationPayload {
    name: string;
    address?: string;
    phone?: string;
    weeklySchedule?: any[];
    appointmentRules?: Record<string, unknown>;
    isMainLocation?: boolean;
}

export interface UpdateLocationPayload {
    name?: string;
    address?: string;
    phone?: string;
    weeklySchedule?: any[];
    appointmentRules?: Record<string, unknown>;
    isMainLocation?: boolean;
    isActive?: boolean;
}
