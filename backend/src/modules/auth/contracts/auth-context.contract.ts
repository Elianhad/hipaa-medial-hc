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
