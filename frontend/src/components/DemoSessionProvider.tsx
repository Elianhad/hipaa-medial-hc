'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface AppUser {
    sub: string;
    name?: string;
    email?: string;
    picture?: string;
    [key: string]: unknown;
}

interface SessionContextValue {
    user: AppUser | null;
    isLoading: boolean;
    error: Error | null;
}

const SessionContext = createContext<SessionContextValue>({
    user: null,
    isLoading: true,
    error: null,
});

export function DemoSessionProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AppUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        fetch('/api/auth/me')
            .then((res) => {
                if (!res.ok) throw new Error('Session fetch failed');
                return res.json();
            })
            .then((data) => setUser(data ?? null))
            .catch((err) => setError(err))
            .finally(() => setIsLoading(false));
    }, []);

    return (
        <SessionContext.Provider value={{ user, isLoading, error }}>
            {children}
        </SessionContext.Provider>
    );
}

/** Drop-in replacement for useUser() from @auth0/nextjs-auth0/client */
export function useUser(): SessionContextValue {
    return useContext(SessionContext);
}
