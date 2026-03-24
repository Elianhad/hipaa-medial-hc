const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/v1';

function buildApiUrl(path: string) {
    return `${API_BASE_URL}${path}`;
}

async function parseJson<T>(response: Response): Promise<T> {
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
        const message = (body as any)?.message ?? `HTTP ${response.status}`;
        throw new Error(Array.isArray(message) ? message.join(', ') : String(message));
    }
    return body as T;
}

export type ProblemCategory = 'acute' | 'chronic' | 'symptomatic';
export type ProblemClinicalStatus = 'active' | 'resolved' | 'inactive' | 'recurrent';
export type ProblemStatus = 'active' | 'resolved' | 'chronic' | 'inactive';

export interface PatientProblem {
    id: string;
    patientId: string;
    title: string;
    description?: string;
    snomedCode?: string;
    icd10Code?: string;
    icd11Code?: string;
    status: ProblemStatus;
    category: ProblemCategory;
    clinicalStatus: ProblemClinicalStatus;
    onsetDate?: string;
    resolutionDate?: string;
    createdAt: string;
    isThreadLocked?: boolean;
}

export interface PatientEvolution {
    id: string;
    patientId: string;
    problemId?: string | null;
    recordType?: string;
    evolutionDate: string;
    evolutionTime: string;
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
    trend?: 'worsening' | 'stable' | 'improving' | 'resolution' | null;
    createdAt?: string;
}

export interface ProblemTransitionEvent {
    id: string;
    transitionType: string;
    fromTitle?: string;
    toTitle?: string;
    fromCategory?: string;
    toCategory?: string;
    fromClinicalStatus?: string;
    toClinicalStatus?: string;
    reasonNote?: string;
    performedBy: string;
    createdAt: string;
}

export interface CreateProblemInput {
    patientId: string;
    title: string;
    description?: string;
    onsetDate?: string;
    category?: ProblemCategory;
    clinicalStatus?: ProblemClinicalStatus;
    status?: ProblemStatus;
    snomedCode?: string;
    icd10Code?: string;
    icd11Code?: string;
}

export interface PromoteProblemInput {
    newTitle: string;
    newCategory?: ProblemCategory;
    newClinicalStatus?: ProblemClinicalStatus;
    snomedCode?: string;
    icd10Code?: string;
    icd11Code?: string;
    reasonNote?: string;
}

export interface DiscardProblemInput {
    closureSummary: string;
    reasonNote?: string;
}

export async function getProblemsByPatient(patientId: string): Promise<PatientProblem[]> {
    const res = await fetch(buildApiUrl(`/clinical-records/problems/patient/${encodeURIComponent(patientId)}`), {
        method: 'GET',
        cache: 'no-store',
    });
    return parseJson<PatientProblem[]>(res);
}

export async function createProblem(input: CreateProblemInput): Promise<PatientProblem> {
    const res = await fetch(buildApiUrl('/clinical-records/problems'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });
    return parseJson<PatientProblem>(res);
}

export async function promoteProblem(problemId: string, input: PromoteProblemInput, patientId?: string): Promise<PatientProblem> {
    const res = await fetch(buildApiUrl(`/chronic-care/problems/${encodeURIComponent(problemId)}/promote`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });
    return parseJson<PatientProblem>(res);
}

export async function discardProblem(problemId: string, input: DiscardProblemInput, patientId?: string): Promise<PatientProblem> {
    const res = await fetch(buildApiUrl(`/chronic-care/problems/${encodeURIComponent(problemId)}/discard`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });
    return parseJson<PatientProblem>(res);
}

export async function getProblemTransitions(problemId: string, patientId?: string): Promise<ProblemTransitionEvent[]> {
    const res = await fetch(buildApiUrl(`/chronic-care/problems/${encodeURIComponent(problemId)}/transitions`), {
        method: 'GET',
        cache: 'no-store',
    });
    return parseJson<ProblemTransitionEvent[]>(res);
}

export async function getEvolutionsByPatient(patientId: string): Promise<PatientEvolution[]> {
    const res = await fetch(
        buildApiUrl(`/clinical-records/evolutions/patient/${encodeURIComponent(patientId)}?page=1&limit=200`),
        {
            method: 'GET',
            cache: 'no-store',
        },
    );

    const body = await parseJson<{ data?: PatientEvolution[] }>(res);
    return body.data ?? [];
}