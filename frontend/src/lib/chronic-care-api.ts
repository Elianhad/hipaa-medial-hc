export interface VademecumBrandOption {
    brandName?: string;
    snomedCtArCode: string;
    snomedDisplay: string;
}

export interface VademecumGroup {
    dciName: string;
    brands: VademecumBrandOption[];
}

export interface CreatePrescriptionInput {
    patientId: string;
    professionalId: string;
    problemId: string;
    evolutionId?: string;
    dciName: string;
    brandName?: string;
    snomedCtArCode?: string;
    drugName: string;
    dose: string;
    frequency: string;
    route?: string;
    durationDays?: number;
    quantity?: number;
    refills?: number;
    instructions?: string;
    doctorLicense: string;
}

export interface SignPrescriptionInput {
    doctorLicense: string;
    signatureProvider?: 'local_hash' | 'pfdr';
    pfdrTransactionId?: string;
    format?: 'json' | 'pdf';
    validationBaseUrl?: string;
}

export interface ProlongedPlanInput {
    patientId: string;
    professionalId: string;
    problemId: string;
    evolutionId?: string;
    dciName: string;
    brandName?: string;
    snomedCtArCode?: string;
    drugName: string;
    dose: string;
    frequency: string;
    route?: string;
    doctorLicense: string;
    installments?: number;
}

export interface SignThreadInput {
    doctorLicense: string;
    signatureProvider?: 'local_hash' | 'pfdr';
    pfdrTransactionId?: string;
}

const BASE = '/api/protected/chronic-care';

async function parseJson<T>(response: Response): Promise<T> {
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
        const msg = (body as any)?.message ?? `HTTP ${response.status}`;
        throw new Error(Array.isArray(msg) ? msg.join(', ') : String(msg));
    }
    return body as T;
}

export async function searchVademecum(q: string): Promise<VademecumGroup[]> {
    const res = await fetch(`${BASE}/vademecum/search?q=${encodeURIComponent(q)}`, {
        method: 'GET',
        cache: 'no-store',
    });
    return parseJson<VademecumGroup[]>(res);
}

export async function createPrescription(input: CreatePrescriptionInput) {
    const res = await fetch(`${BASE}/prescriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });
    return parseJson<any>(res);
}

export async function createProlongedPlan(input: ProlongedPlanInput) {
    const res = await fetch(`${BASE}/prescriptions/prolonged-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });
    return parseJson<any[]>(res);
}

export async function signPrescription(id: string, input: SignPrescriptionInput) {
    const res = await fetch(`${BASE}/prescriptions/${id}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });
    return parseJson<any>(res);
}

export async function getPrescriptionDocument(id: string, format: 'json' | 'pdf' = 'json') {
    const res = await fetch(`${BASE}/prescriptions/${id}/document?format=${format}`, {
        method: 'GET',
        cache: 'no-store',
    });
    return parseJson<any>(res);
}

export async function signProblemThread(problemId: string, input: SignThreadInput) {
    const res = await fetch(`${BASE}/problems/${problemId}/sign-thread`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });
    return parseJson<any>(res);
}

export async function validatePrescriptionToken(token: string) {
    const res = await fetch(`/api/prescriptions/validate/${encodeURIComponent(token)}`, {
        method: 'GET',
        cache: 'no-store',
    });
    return parseJson<any>(res);
}
