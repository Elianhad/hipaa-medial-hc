'use server';

import { auth0 } from '@/lib/auth0';
import { ProfessionalBoardResponse, ProfessionalConfigResponse, ProfessionalConfigPatch, ProfessionalLocation, CreateLocationPayload, UpdateLocationPayload } from './professional-action-types';
import { getBackendApiBaseUrl } from '@/lib/backend-api-url';

const PROFESSIONAL_API_BASE_URL = getBackendApiBaseUrl();

/**
 * CLASE DE ERROR PERSONALIZADA
 * Evita que las trazas de error de NestJS o de red se filtren completas al cliente.
 */
class ApiError extends Error {
    constructor(public status: number, message: string) {
        super(message);
        this.name = 'ApiError';
    }
}

/**
 * UTILIDADES CORE (Autenticación y Fetch)
 */
async function getAuthToken(): Promise<string | null> {
    try {
        const tokenResponse = await auth0.getAccessToken();
        return tokenResponse?.token ?? null;
    } catch (error) {
        console.error('[AUTH ERROR] Error getting auth token:', error);
        return null;
    }
}

async function fetchWithAuth<T>(url: string, options: RequestInit = {}): Promise<T> {
    const token = await getAuthToken();
    if (!token) {
        throw new Error('No autorizado. Por favor, inicie sesión.');
    }

    const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
    };

    const response = await fetch(url, {
        ...options,
        headers,
        cache: 'no-store',
    });

    if (!response.ok) {
        let errorMessage = 'Ocurrió un error inesperado en el servidor.';
        try {
            const errorData = await response.json();
            errorMessage = Array.isArray(errorData.message)
                ? errorData.message.join(', ')
                : errorData.message || errorMessage;
        } catch {
            // Si no devuelve JSON, no se lo mandamos al frontend por seguridad, solo lo logueamos en el server.
            const text = await response.text().catch(() => '');
            console.error(`[API ERROR RAW] ${response.status} en ${url}:`, text.substring(0, 200));
        }
        throw new ApiError(response.status, errorMessage);
    }

    // Manejo de respuestas vacías (ej. 204 No Content en los DELETE)
    if (response.status === 204) {
        return undefined as T;
    }

    return response.json() as Promise<T>;
}

async function resolveProfessionalIdFromSession(): Promise<string> {
    try {
        const session = await auth0.getSession();
        if (!session?.user) {
            throw new Error('No autenticado');
        }

        // Reutilizamos nuestro fetchWithAuth robusto en lugar de hacerlo manual
        const registration = await fetchWithAuth<{ professionalId?: string }>(
            `${PROFESSIONAL_API_BASE_URL}/auth/registration-status`,
            { method: 'GET' }
        );

        const professionalId = registration?.professionalId?.trim();
        if (!professionalId) {
            throw new Error('No hay professionalId en la sesion. Completa el alta profesional.');
        }

        return professionalId;
    } catch (error) {
        throw error instanceof Error
            ? error
            : new Error('Error resolviendo Professional ID');
    }
}

/**
 * FUNCIONES DE API DIRECTAS (Requieren ID explícito)
 */
export async function getProfessionalTodayBoard(professionalId: string): Promise<ProfessionalBoardResponse> {
    return fetchWithAuth<ProfessionalBoardResponse>(
        `${PROFESSIONAL_API_BASE_URL}/appointments/professional/${professionalId}/today`,
    );
}

export async function patchAppointmentAttendance(
    appointmentId: string,
    attendance: 'pending' | 'present' | 'absent',
): Promise<{ id: string; attendance: 'pending' | 'present' | 'absent' }> {
    return fetchWithAuth<{ id: string; attendance: 'pending' | 'present' | 'absent' }>(
        `${PROFESSIONAL_API_BASE_URL}/appointments/${appointmentId}/attendance`,
        {
            method: 'PATCH',
            body: JSON.stringify({ attendance }),
        },
    );
}

export async function getProfessionalConfig(professionalId: string): Promise<ProfessionalConfigResponse> {
    return fetchWithAuth<ProfessionalConfigResponse>(
        `${PROFESSIONAL_API_BASE_URL}/professionals/${professionalId}/config`,
    );
}

export async function patchProfessionalConfig(
    professionalId: string,
    payload: ProfessionalConfigPatch,
): Promise<ProfessionalConfigResponse> {
    return fetchWithAuth<ProfessionalConfigResponse>(
        `${PROFESSIONAL_API_BASE_URL}/professionals/${professionalId}/config`,
        {
            method: 'PATCH',
            body: JSON.stringify(payload),
        },
    );
}

export async function getProfessionalById(professionalId: string): Promise<Record<string, unknown>> {
    return fetchWithAuth<Record<string, unknown>>(
        `${PROFESSIONAL_API_BASE_URL}/professionals/${professionalId}`,
    );
}

export async function getProfessionalLocations(professionalId: string): Promise<ProfessionalLocation[]> {
    return fetchWithAuth<ProfessionalLocation[]>(
        `${PROFESSIONAL_API_BASE_URL}/professionals/${professionalId}/locations`,
    );
}

export async function getProfessionalLocation(professionalId: string, locationId: string): Promise<ProfessionalLocation> {
    return fetchWithAuth<ProfessionalLocation>(
        `${PROFESSIONAL_API_BASE_URL}/professionals/${professionalId}/locations/${locationId}`,
    );
}

export async function createProfessionalLocation(
    professionalId: string,
    payload: CreateLocationPayload,
): Promise<ProfessionalLocation> {
    return fetchWithAuth<ProfessionalLocation>(
        `${PROFESSIONAL_API_BASE_URL}/professionals/${professionalId}/locations`,
        {
            method: 'POST',
            body: JSON.stringify(payload),
        },
    );
}

export async function updateProfessionalLocation(
    professionalId: string,
    locationId: string,
    payload: UpdateLocationPayload,
): Promise<ProfessionalLocation> {
    return fetchWithAuth<ProfessionalLocation>(
        `${PROFESSIONAL_API_BASE_URL}/professionals/${professionalId}/locations/${locationId}`,
        {
            method: 'PATCH',
            body: JSON.stringify(payload),
        },
    );
}

export async function deleteProfessionalLocation(professionalId: string, locationId: string): Promise<void> {
    return fetchWithAuth<void>(
        `${PROFESSIONAL_API_BASE_URL}/professionals/${professionalId}/locations/${locationId}`,
        { method: 'DELETE' },
    );
}

/**
 *  FUNCIONES "AUTO" (Resuelven el ID del profesional automáticamente desde la sesión)
 */
export async function getProfessionalTodayBoardAuto(): Promise<ProfessionalBoardResponse> {
    const professionalId = await resolveProfessionalIdFromSession();
    return getProfessionalTodayBoard(professionalId);
}

export async function getProfessionalConfigAuto(): Promise<ProfessionalConfigResponse> {
    const professionalId = await resolveProfessionalIdFromSession();
    return getProfessionalConfig(professionalId);
}

export async function patchProfessionalConfigAuto(payload: ProfessionalConfigPatch): Promise<ProfessionalConfigResponse> {
    const professionalId = await resolveProfessionalIdFromSession();
    return patchProfessionalConfig(professionalId, payload);
}

export async function getProfessionalLocationsAuto(): Promise<ProfessionalLocation[]> {
    const professionalId = await resolveProfessionalIdFromSession();
    return getProfessionalLocations(professionalId);
}

export async function createProfessionalLocationAuto(payload: CreateLocationPayload): Promise<ProfessionalLocation> {
    const professionalId = await resolveProfessionalIdFromSession();
    return createProfessionalLocation(professionalId, payload);
}

export async function updateProfessionalLocationAuto(locationId: string, payload: UpdateLocationPayload): Promise<ProfessionalLocation> {
    const professionalId = await resolveProfessionalIdFromSession();
    return updateProfessionalLocation(professionalId, locationId, payload);
}

export async function deleteProfessionalLocationAuto(locationId: string): Promise<void> {
    const professionalId = await resolveProfessionalIdFromSession();
    return deleteProfessionalLocation(professionalId, locationId);
}