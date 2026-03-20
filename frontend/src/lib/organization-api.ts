// ─── Types ────────────────────────────────────────────────────────────────────

export interface OrgSummaryResponse {
    activeProfessionals: number;
    todayConsultations: number;
    pendingAudit: number;
    billingInProgress: number;
}

export interface OrgStaffMember {
    id: string;
    userId: string;
    name: string;
    specialty: string | null;
    role: string;
    isActive: boolean;
}

export interface OrgStaffResponse {
    items: OrgStaffMember[];
    total: number;
}

export interface OrgAgendaItem {
    id: string;
    patientName: string;
    patientId: string;
    professionalId: string;
    professionalName?: string;
    scheduledAt: string;
    reason: string | null;
    durationMinutes: number;
    attendance: 'pending' | 'present' | 'absent';
}

export interface OrgAgendaResponse {
    date: string;
    total: number;
    items: OrgAgendaItem[];
}

export interface OrgBillingItem {
    id: string;
    professionalName: string;
    patientName: string;
    serviceName: string;
    amount: number;
    status: 'pending' | 'paid' | 'rejected';
    date: string;
}

export interface OrgBillingResponse {
    pendingAmount: number;
    paidThisMonth: number;
    rejectedCount: number;
    items: OrgBillingItem[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const ORGANIZATION_API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/v1';

export const DEMO_ORG_TENANT_ID =
    process.env.NEXT_PUBLIC_DEMO_ORG_TENANT_ID ?? '00000000-0000-0000-0000-000000000010';

// ─── Demo fallback data ───────────────────────────────────────────────────────

export const DEMO_ORG_SUMMARY: OrgSummaryResponse = {
    activeProfessionals: 5,
    todayConsultations: 18,
    pendingAudit: 7,
    billingInProgress: 3,
};

export const DEMO_ORG_STAFF: OrgStaffMember[] = [
    { id: 'staff-001', userId: 'user-001', name: 'Dr. Juan Fulano', specialty: 'Clínica Médica', role: 'admin', isActive: true },
    { id: 'staff-002', userId: 'user-002', name: 'Dra. Martina López', specialty: 'Cardiología', role: 'staff', isActive: true },
    { id: 'staff-003', userId: 'user-003', name: 'Dr. Carlos Sosa', specialty: 'Pediatría', role: 'staff', isActive: true },
    { id: 'staff-004', userId: 'user-004', name: 'Dra. Ana Herrera', specialty: 'Ginecología', role: 'staff', isActive: true },
    { id: 'staff-005', userId: 'user-005', name: 'Dr. Ramón Díaz', specialty: 'Traumatología', role: 'staff', isActive: false },
];

export const DEMO_ORG_AGENDA: OrgAgendaItem[] = [
    { id: 'apt-o-001', patientName: 'Ana García', patientId: 'pat-001', professionalId: 'user-001', professionalName: 'Dr. Juan Fulano', scheduledAt: new Date().toISOString().replace(/T.*/, 'T09:00:00.000Z'), reason: 'Control de HTA', durationMinutes: 20, attendance: 'present' },
    { id: 'apt-o-002', patientName: 'Carlos Pérez', patientId: 'pat-002', professionalId: 'user-002', professionalName: 'Dra. Martina López', scheduledAt: new Date().toISOString().replace(/T.*/, 'T09:30:00.000Z'), reason: 'Ecocardiograma seguimiento', durationMinutes: 30, attendance: 'pending' },
    { id: 'apt-o-003', patientName: 'Lucía Méndez', patientId: 'pat-003', professionalId: 'user-003', professionalName: 'Dr. Carlos Sosa', scheduledAt: new Date().toISOString().replace(/T.*/, 'T10:00:00.000Z'), reason: 'Consulta pediátrica', durationMinutes: 20, attendance: 'pending' },
    { id: 'apt-o-004', patientName: 'Pedro Fernández', patientId: 'pat-004', professionalId: 'user-001', professionalName: 'Dr. Juan Fulano', scheduledAt: new Date().toISOString().replace(/T.*/, 'T10:30:00.000Z'), reason: 'Diabetes tipo II - control', durationMinutes: 20, attendance: 'absent' },
    { id: 'apt-o-005', patientName: 'Sofía Romero', patientId: 'pat-005', professionalId: 'user-004', professionalName: 'Dra. Ana Herrera', scheduledAt: new Date().toISOString().replace(/T.*/, 'T11:00:00.000Z'), reason: 'Control prenatal', durationMinutes: 30, attendance: 'pending' },
    { id: 'apt-o-006', patientName: 'Jorge Blanco', patientId: 'pat-006', professionalId: 'user-002', professionalName: 'Dra. Martina López', scheduledAt: new Date().toISOString().replace(/T.*/, 'T11:30:00.000Z'), reason: 'Arritmia - control', durationMinutes: 20, attendance: 'present' },
];

export const DEMO_ORG_BILLING: OrgBillingResponse = {
    pendingAmount: 85400,
    paidThisMonth: 312750,
    rejectedCount: 4,
    items: [
        { id: 'bill-001', professionalName: 'Dr. Juan Fulano', patientName: 'Ana García', serviceName: 'Consulta clínica', amount: 8500, status: 'paid', date: new Date().toISOString().slice(0, 10) },
        { id: 'bill-002', professionalName: 'Dra. Martina López', patientName: 'Carlos Pérez', serviceName: 'Ecocardiograma', amount: 24000, status: 'pending', date: new Date().toISOString().slice(0, 10) },
        { id: 'bill-003', professionalName: 'Dr. Carlos Sosa', patientName: 'Lucía Méndez', serviceName: 'Consulta pediátrica', amount: 7200, status: 'pending', date: new Date().toISOString().slice(0, 10) },
        { id: 'bill-004', professionalName: 'Dr. Ramón Díaz', patientName: 'Roberto Castro', serviceName: 'Artroscopía rodilla', amount: 48000, status: 'rejected', date: new Date(Date.now() - 86400000).toISOString().slice(0, 10) },
        { id: 'bill-005', professionalName: 'Dra. Ana Herrera', patientName: 'Sofía Romero', serviceName: 'Control prenatal', amount: 6800, status: 'paid', date: new Date(Date.now() - 86400000).toISOString().slice(0, 10) },
    ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function parseJsonResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status} ${response.statusText} ${text}`.trim());
    }
    return response.json() as Promise<T>;
}

// ─── API functions ────────────────────────────────────────────────────────────

export async function getOrgSummary(
    tenantId = DEMO_ORG_TENANT_ID,
): Promise<OrgSummaryResponse> {
    const response = await fetch(
        `${ORGANIZATION_API_BASE_URL}/tenants/${tenantId}/summary`,
        { cache: 'no-store' },
    );
    return parseJsonResponse<OrgSummaryResponse>(response);
}

export async function getOrgStaff(
    tenantId = DEMO_ORG_TENANT_ID,
): Promise<OrgStaffResponse> {
    const response = await fetch(
        `${ORGANIZATION_API_BASE_URL}/tenants/${tenantId}/staff`,
        { cache: 'no-store' },
    );
    const items = await parseJsonResponse<OrgStaffMember[]>(response);
    return { items, total: items.length };
}

export async function getOrgAgenda(
    tenantId = DEMO_ORG_TENANT_ID,
    date?: string,
): Promise<OrgAgendaResponse> {
    const url = new URL(`${ORGANIZATION_API_BASE_URL}/appointments/organization/${tenantId}/today`);
    if (date) url.searchParams.set('date', date);
    const response = await fetch(url.toString(), { cache: 'no-store' });
    return parseJsonResponse<OrgAgendaResponse>(response);
}

/** Billing endpoint is a stub — always falls back to demo data in v1. */
export async function getOrgBilling(
    _tenantId = DEMO_ORG_TENANT_ID,
): Promise<OrgBillingResponse> {
    throw new Error('Billing API not yet available (v1 stub)');
}
