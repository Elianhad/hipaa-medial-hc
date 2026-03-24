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

export const DEFAULT_ORG_TENANT_ID = process.env.NEXT_PUBLIC_ORG_TENANT_ID ?? '';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function parseJsonResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status} ${response.statusText} ${text}`.trim());
    }
    return response.json() as Promise<T>;
}

function resolveTenantId(tenantId?: string): string {
    const resolved = (tenantId ?? DEFAULT_ORG_TENANT_ID).trim();
    if (!resolved) {
        throw new Error('Tenant ID no configurado. Definí NEXT_PUBLIC_ORG_TENANT_ID o pasalo explícitamente.');
    }
    return resolved;
}

// ─── API functions ────────────────────────────────────────────────────────────

export async function getOrgSummary(
    tenantId?: string,
): Promise<OrgSummaryResponse> {
    const resolvedTenantId = resolveTenantId(tenantId);
    const response = await fetch(
        `${ORGANIZATION_API_BASE_URL}/tenants/${resolvedTenantId}/summary`,
        { cache: 'no-store' },
    );
    return parseJsonResponse<OrgSummaryResponse>(response);
}

export async function getOrgStaff(
    tenantId?: string,
): Promise<OrgStaffResponse> {
    const resolvedTenantId = resolveTenantId(tenantId);
    const response = await fetch(
        `${ORGANIZATION_API_BASE_URL}/tenants/${resolvedTenantId}/staff`,
        { cache: 'no-store' },
    );
    const items = await parseJsonResponse<OrgStaffMember[]>(response);
    return { items, total: items.length };
}

export async function getOrgAgenda(
    tenantId?: string,
    date?: string,
): Promise<OrgAgendaResponse> {
    const resolvedTenantId = resolveTenantId(tenantId);
    const url = new URL(`${ORGANIZATION_API_BASE_URL}/appointments/organization/${resolvedTenantId}/today`);
    if (date) url.searchParams.set('date', date);
    const response = await fetch(url.toString(), { cache: 'no-store' });
    return parseJsonResponse<OrgAgendaResponse>(response);
}

export async function getOrgBilling(
    _tenantId?: string,
): Promise<OrgBillingResponse> {
    throw new Error('Billing API no disponible en backend.');
}
