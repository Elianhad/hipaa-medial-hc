function buildProtectedUrl(path: string) {
    return `/api/protected${path}`;
}

async function parseJson<T>(response: Response): Promise<T> {
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
        const message = (body as any)?.message ?? `HTTP ${response.status}`;
        throw new Error(Array.isArray(message) ? message.join(', ') : String(message));
    }
    return body as T;
}

export type ProblemCategory = 'encounter_diagnosis' | 'problem_list_item' | 'health_concern';
export type ProblemClinicalStatus = 'active' | 'resolved' | 'inactive' | 'recurrence' | 'remission';
export type ProblemVerificationStatus = 'provisional' | 'differential' | 'confirmed' | 'refuted';
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
    verificationStatus?: ProblemVerificationStatus;
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

export interface CreateProblemWithEvolutionInput {
    patientId: string;
    title: string;
    category?: ProblemCategory;
    verificationStatus?: ProblemVerificationStatus;
    clinicalStatus?: ProblemClinicalStatus;
    snomedCode: string;
    icd10Code?: string;
    icd11Code?: string;
    onsetDate?: string;
    recurrenceOfProblemId?: string;
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
    professionalId?: string;
}

export async function getProblemsByPatient(patientId: string): Promise<PatientProblem[]> {
    const res = await fetch(buildProtectedUrl(`/clinical-records/problems/patient/${encodeURIComponent(patientId)}`), {
        method: 'GET',
        cache: 'no-store',
    });
    return parseJson<PatientProblem[]>(res);
}

export async function createProblem(input: CreateProblemInput): Promise<PatientProblem> {
    const res = await fetch(buildProtectedUrl('/clinical-records/problems'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });
    return parseJson<PatientProblem>(res);
}

export async function checkProblemDuplicate(
    patientId: string,
    snomedCode?: string,
    icd10Code?: string,
    icd11Code?: string,
): Promise<PatientProblem | null> {
    const params = new URLSearchParams({ patientId });
    if (snomedCode) params.set('snomedCode', snomedCode);
    if (icd10Code) params.set('icd10Code', icd10Code);
    if (icd11Code) params.set('icd11Code', icd11Code);
    const res = await fetch(
        buildProtectedUrl(`/clinical-records/problems/duplicate-check?${params.toString()}`),
        { method: 'GET', cache: 'no-store' },
    );
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const message = (body as any)?.message ?? `HTTP ${res.status}`;
        throw new Error(Array.isArray(message) ? message.join(', ') : String(message));
    }
    // NestJS sends an empty body (not JSON null) when the service returns null.
    // An empty/non-JSON body means no duplicate was found.
    const text = await res.text().catch(() => '');
    if (!text.trim()) return null;
    try {
        return JSON.parse(text) as PatientProblem | null;
    } catch {
        return null;
    }
}

export async function createProblemWithEvolution(
    input: CreateProblemWithEvolutionInput,
): Promise<PatientProblem> {
    const res = await fetch(buildProtectedUrl('/clinical-records/problems/with-evolution'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });
    return parseJson<PatientProblem>(res);
}

export async function promoteProblem(problemId: string, input: PromoteProblemInput, patientId?: string): Promise<PatientProblem> {
    const res = await fetch(buildProtectedUrl(`/chronic-care/problems/${encodeURIComponent(problemId)}/promote`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });
    return parseJson<PatientProblem>(res);
}

export async function discardProblem(problemId: string, input: DiscardProblemInput, patientId?: string): Promise<PatientProblem> {
    const res = await fetch(buildProtectedUrl(`/chronic-care/problems/${encodeURIComponent(problemId)}/discard`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });
    return parseJson<PatientProblem>(res);
}

export async function getProblemTransitions(problemId: string, patientId?: string): Promise<ProblemTransitionEvent[]> {
    const res = await fetch(buildProtectedUrl(`/chronic-care/problems/${encodeURIComponent(problemId)}/transitions`), {
        method: 'GET',
        cache: 'no-store',
    });
    return parseJson<ProblemTransitionEvent[]>(res);
}

export async function getEvolutionsByPatient(patientId: string): Promise<PatientEvolution[]> {
    const res = await fetch(
        buildProtectedUrl(`/clinical-records/evolutions/patient/${encodeURIComponent(patientId)}?page=1&limit=200`),
        {
            method: 'GET',
            cache: 'no-store',
        },
    );

    const body = await parseJson<{ data?: PatientEvolution[] }>(res);
    return body.data ?? [];
}