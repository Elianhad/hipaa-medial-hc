'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface AppUser {
    sub: string;
    name?: string;
    email?: string;
    picture?: string;
    appState?: {
        registration?: {
            registered?: boolean;
            needsRegistration?: boolean;
            reason?: string;
            tenantId?: string;
            userId?: string;
            role?: string;
            hasProfessionalProfile?: boolean;
            hasOrganizationMembership?: boolean;
            professionalId?: string;
        } | null;
    };
    [key: string]: unknown;
}

interface SessionContextValue {
    user: AppUser | null;
    isLoading: boolean;
    error: Error | null;
    refreshSession: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue>({
    user: null,
    isLoading: true,
    error: null,
    refreshSession: async () => undefined,
});

export function AppSessionProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AppUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const refreshSession = async () => {
        setIsLoading(true);

        try {
            const res = await fetch('/api/auth/me', {
                method: 'GET',
                cache: 'no-store',
            });

            if (!res.ok) {
                throw new Error('Session fetch failed');
            }

            const data = await res.json();
            setUser(data ?? null);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Session fetch failed'));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void refreshSession();
    }, []);

    return (
        <SessionContext.Provider value={{ user, isLoading, error, refreshSession }}>
            {children}
        </SessionContext.Provider>
    );
}

export function useUser(): SessionContextValue {
    return useContext(SessionContext);
}
