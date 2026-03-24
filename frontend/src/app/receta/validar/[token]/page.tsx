'use client';

import { useEffect, useState } from 'react';
import { validatePrescriptionToken } from '@/lib/chronic-care-api';

export default function ValidatePrescriptionPage({ params }: { params: { token: string } }) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const run = async () => {
            try {
                const result = await validatePrescriptionToken(params.token);
                setData(result);
            } catch (err: any) {
                setError(err.message ?? 'No se pudo validar la receta');
            } finally {
                setLoading(false);
            }
        };

        run();
    }, [params.token]);

    return (
        <main className="min-h-screen bg-slate-950 px-4 py-12 text-white">
            <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-white/5 p-6">
                <h1 className="text-2xl font-bold">Validación de Receta Digital</h1>
                <p className="mt-1 text-sm text-slate-400">Token: {params.token}</p>

                {loading && <p className="mt-6 text-slate-300">Validando...</p>}

                {error && (
                    <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-300">
                        {error}
                    </div>
                )}

                {data && (
                    <div className="mt-6 space-y-3 text-sm">
                        <Row label="Receta" value={data.prescriptionId} />
                        <Row label="Estado" value={data.status} />
                        <Row label="Médico matrícula" value={data.doctorLicense} />
                        <Row label="Diagnóstico" value={data.diagnosis} />
                        <Row label="DCI" value={data.dciName} />
                        <Row label="Marca" value={data.brandName || 'Sin marca'} />
                        <Row label="SNOMED CT AR" value={data.snomedCtArCode} />
                        <Row label="Proveedor firma" value={data.signatureProvider} />
                        <Row label="Firmada" value={String(Boolean(data.signedAt))} />
                        <Row label="Hash" value={data.hash} mono />
                        <div className={`rounded-md px-3 py-2 font-medium ${data.isValid ? 'bg-emerald-600/20 text-emerald-300' : 'bg-rose-600/20 text-rose-300'}`}>
                            {data.isValid ? 'Receta válida' : 'Receta inválida o incompleta'}
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    return (
        <div className="grid grid-cols-[170px_1fr] gap-3 rounded-md bg-white/5 px-3 py-2">
            <span className="text-slate-400">{label}</span>
            <span className={mono ? 'font-mono text-xs break-all' : ''}>{value}</span>
        </div>
    );
}
