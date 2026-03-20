export type AppointmentAttendanceApi = 'pending' | 'present' | 'absent';

export interface ProfessionalBoardItem {
    id: string;
    patientId: string;
    patientName: string;
    scheduledAt: string;
    reason: string | null;
    durationMinutes: number;
    appointmentStatus: string;
    attendance: AppointmentAttendanceApi;
}

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
    weeklySchedule?: Record<string, unknown>;
    appointmentRules?: Record<string, unknown>;
}

export interface ProfessionalConfigPatch {
    specialty?: string;
    bio?: string;
    photoUrl?: string;
    consultationFee?: number;
    isPublic?: boolean;
    acceptedInsurances?: string[];
    weeklySchedule?: Record<string, unknown>;
    appointmentRules?: Record<string, unknown>;
}

export const PROFESSIONAL_API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/v1';

export const DEMO_PROFESSIONAL_ID =
    process.env.NEXT_PUBLIC_DEMO_PROFESSIONAL_ID ?? '00000000-0000-0000-0000-000000000001';

async function parseJsonResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status} ${response.statusText} ${text}`.trim());
    }
    return response.json() as Promise<T>;
}

export async function getProfessionalTodayBoard(
    professionalId = DEMO_PROFESSIONAL_ID,
): Promise<ProfessionalBoardResponse> {
    const response = await fetch(
        `${PROFESSIONAL_API_BASE_URL}/appointments/professional/${professionalId}/today`,
        {
            cache: 'no-store',
        },
    );

    return parseJsonResponse<ProfessionalBoardResponse>(response);
}

export async function patchAppointmentAttendance(
    appointmentId: string,
    attendance: AppointmentAttendanceApi,
): Promise<{ id: string; attendance: AppointmentAttendanceApi }> {
    const response = await fetch(
        `${PROFESSIONAL_API_BASE_URL}/appointments/${appointmentId}/attendance`,
        {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ attendance }),
        },
    );

    return parseJsonResponse<{ id: string; attendance: AppointmentAttendanceApi }>(response);
}

export async function getProfessionalConfig(
    professionalId = DEMO_PROFESSIONAL_ID,
): Promise<ProfessionalConfigResponse> {
    const response = await fetch(
        `${PROFESSIONAL_API_BASE_URL}/professionals/${professionalId}/config`,
        {
            cache: 'no-store',
        },
    );

    return parseJsonResponse<ProfessionalConfigResponse>(response);
}

export async function patchProfessionalConfig(
    payload: ProfessionalConfigPatch,
    professionalId = DEMO_PROFESSIONAL_ID,
): Promise<ProfessionalConfigResponse> {
    const response = await fetch(
        `${PROFESSIONAL_API_BASE_URL}/professionals/${professionalId}/config`,
        {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        },
    );

    return parseJsonResponse<ProfessionalConfigResponse>(response);
}
