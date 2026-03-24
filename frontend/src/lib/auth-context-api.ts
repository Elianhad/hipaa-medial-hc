export type AccessContextKind = 'patient' | 'professional' | 'organization' | 'superadmin';

export interface AccessContext {
    kind: AccessContextKind;
    enabled: boolean;
    label: string;
    reason?: string;
}

export interface AuthContextResponse {
    identity: {
        sub: string;
        email?: string;
        name?: string;
    };
    roles: string[];
    contexts: AccessContext[];
    defaultContext: AccessContextKind;
}

async function parseJson<T>(response: Response): Promise<T> {
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
        const message = (body as { message?: string | string[] })?.message ?? `HTTP ${response.status}`;
        throw new Error(Array.isArray(message) ? message.join(', ') : message);
    }
    return body as T;
}

export async function getAuthContext(): Promise<AuthContextResponse> {
    const response = await fetch('/api/auth/context', {
        method: 'GET',
        cache: 'no-store',
    });
    return parseJson<AuthContextResponse>(response);
}

export async function selectActiveContext(context: AccessContextKind): Promise<void> {
    const response = await fetch('/api/auth/context/select', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ context }),
    });
    await parseJson(response);
}
