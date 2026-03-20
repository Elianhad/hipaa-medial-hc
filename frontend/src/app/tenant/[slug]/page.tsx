/**
 * Dynamic tenant entry-point: /tenant/[slug]
 *
 * This page is the target of the subdomain rewrite in middleware.ts.
 * It fetches the tenant record from the backend to determine type
 * (independent | organization) and renders the correct public page.
 */

import { redirect } from 'next/navigation';

interface TenantRecord {
    id: string;
    type: 'independent' | 'organization';
    name: string;
    subdomain: string;
    logoUrl: string | null;
}

async function fetchTenant(slug: string): Promise<TenantRecord | null> {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';
    try {
        const res = await fetch(`${apiUrl}/tenants/by-subdomain/${slug}`, {
            next: { revalidate: 60 },
        });
        if (!res.ok) return null;
        return res.json() as Promise<TenantRecord>;
    } catch {
        return null;
    }
}

export default async function TenantEntryPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const tenant = await fetchTenant(slug);

    if (!tenant) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
                <div className="text-center space-y-3">
                    <h1 className="text-2xl font-bold">Portal no encontrado</h1>
                    <p className="text-slate-400">
                        El subdominio <span className="font-mono text-indigo-400">{slug}</span> no está
                        registrado en la plataforma.
                    </p>
                    <a href="/" className="text-indigo-400 underline text-sm">
                        Volver al inicio
                    </a>
                </div>
            </main>
        );
    }

    // Redirect to the appropriate public booking page
    if (tenant.type === 'organization') {
        redirect(`/org/${slug}`);
    } else {
        redirect(`/booking/${slug}`);
    }
}
