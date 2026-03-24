'use client';

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
    createPrescription,
    createProlongedPlan,
    getPrescriptionDocument,
    searchVademecum,
    signPrescription,
    signProblemThread,
    type VademecumGroup,
} from '@/lib/chronic-care-api';

type SignatureProvider = 'local_hash' | 'pfdr';

interface Props {
    patientId: string;
    professionalId: string;
    initialProblemId?: string;
    initialProblemTitle?: string;
}

export default function PrescriptionSignatureFlow({
    patientId,
    professionalId,
    initialProblemId,
    initialProblemTitle,
}: Props) {
    const [resolvedProfessionalId, setResolvedProfessionalId] = useState(professionalId);
    const [problemId, setProblemId] = useState(initialProblemId ?? '');
    const [problemTitle, setProblemTitle] = useState(initialProblemTitle ?? '');
    const [evolutionId, setEvolutionId] = useState('');
    const [doctorLicense, setDoctorLicense] = useState('');

    const [query, setQuery] = useState('');
    const [results, setResults] = useState<VademecumGroup[]>([]);
    const [selectedDci, setSelectedDci] = useState('');
    const [selectedBrand, setSelectedBrand] = useState('');
    const [selectedSnomed, setSelectedSnomed] = useState('');

    const [drugName, setDrugName] = useState('');
    const [dose, setDose] = useState('');
    const [frequency, setFrequency] = useState('');
    const [route, setRoute] = useState('oral');
    const [durationDays, setDurationDays] = useState(30);
    const [instructions, setInstructions] = useState('');

    const [isChronic, setIsChronic] = useState(true);
    const [installments, setInstallments] = useState(3);

    const [prescriptionId, setPrescriptionId] = useState('');
    const [validationUrl, setValidationUrl] = useState('');
    const [signedHash, setSignedHash] = useState('');
    const [pdfBase64, setPdfBase64] = useState<string | null>(null);

    const [provider, setProvider] = useState<SignatureProvider>('local_hash');
    const [pfdrTxId, setPfdrTxId] = useState('');

    const [isBusy, setIsBusy] = useState(false);

    const selectedGroup = useMemo(
        () => results.find((group) => group.dciName === selectedDci),
        [results, selectedDci],
    );

    const selectedBrandOption = useMemo(() => {
        if (!selectedGroup) return undefined;
        if (!selectedBrand) return selectedGroup.brands.find((option) => !option.brandName);
        return selectedGroup.brands.find((option) => option.brandName === selectedBrand);
    }, [selectedGroup, selectedBrand]);

    async function handleSearch() {
        if (query.trim().length < 2) {
            toast.error('Ingresa al menos 2 caracteres para buscar en vademécum.');
            return;
        }

        setIsBusy(true);
        try {
            const items = await searchVademecum(query.trim());
            setResults(items);
            if (!items.length) toast('Sin resultados para ese término.');
        } catch (error: any) {
            toast.error(error.message ?? 'No se pudo consultar el vademécum.');
        } finally {
            setIsBusy(false);
        }
    }

    function applySelection(dciName: string, brandName?: string, snomed?: string) {
        setSelectedDci(dciName);
        setSelectedBrand(brandName ?? '');
        setSelectedSnomed(snomed ?? '');
        setDrugName(brandName?.trim() ? `${dciName} (${brandName})` : dciName);
    }

    async function handleCreatePrescription() {
        if (!resolvedProfessionalId.trim()) {
            toast.error('El ID del profesional es obligatorio.');
            return;
        }
        if (!problemId.trim()) {
            toast.error('El ID de problema es obligatorio.');
            return;
        }
        if (!selectedDci.trim()) {
            toast.error('Debes seleccionar una DCI (droga genérica).');
            return;
        }
        if (!doctorLicense.trim()) {
            toast.error('La matrícula del médico es obligatoria para receta digital.');
            return;
        }

        setIsBusy(true);
        try {
            const created = await createPrescription({
                patientId,
                professionalId: resolvedProfessionalId,
                problemId,
                evolutionId: evolutionId || undefined,
                dciName: selectedDci,
                brandName: selectedBrand || undefined,
                snomedCtArCode: selectedSnomed || selectedBrandOption?.snomedCtArCode,
                drugName: drugName || selectedDci,
                dose,
                frequency,
                route,
                durationDays,
                instructions: instructions || undefined,
                doctorLicense,
            });

            setPrescriptionId(created.id);
            toast.success('Receta creada y vinculada al problema correctamente.');
        } catch (error: any) {
            toast.error(error.message ?? 'No se pudo crear la receta.');
        } finally {
            setIsBusy(false);
        }
    }

    async function handleCreateProlongedPlan() {
        if (!resolvedProfessionalId.trim()) {
            toast.error('El ID del profesional es obligatorio.');
            return;
        }
        if (!isChronic) {
            toast.error('La receta prolongada solo aplica a problemas crónicos.');
            return;
        }
        if (!problemId.trim() || !selectedDci.trim() || !doctorLicense.trim()) {
            toast.error('Completa problema, DCI y matrícula antes de crear plan prolongado.');
            return;
        }

        setIsBusy(true);
        try {
            const plan = await createProlongedPlan({
                patientId,
                professionalId: resolvedProfessionalId,
                problemId,
                evolutionId: evolutionId || undefined,
                dciName: selectedDci,
                brandName: selectedBrand || undefined,
                snomedCtArCode: selectedSnomed || selectedBrandOption?.snomedCtArCode,
                drugName: drugName || selectedDci,
                dose,
                frequency,
                route,
                doctorLicense,
                installments,
            });

            if (plan.length > 0) {
                setPrescriptionId(plan[0].id);
            }
            toast.success(`Plan prolongado creado: ${plan.length} órdenes mensuales.`);
        } catch (error: any) {
            toast.error(error.message ?? 'No se pudo crear el plan prolongado.');
        } finally {
            setIsBusy(false);
        }
    }

    async function handleSignPrescription(format: 'json' | 'pdf') {
        if (!prescriptionId) {
            toast.error('Primero crea una receta.');
            return;
        }
        if (!doctorLicense.trim()) {
            toast.error('La matrícula del médico es obligatoria para firmar.');
            return;
        }

        setIsBusy(true);
        try {
            const signed = await signPrescription(prescriptionId, {
                doctorLicense,
                signatureProvider: provider,
                pfdrTransactionId: provider === 'pfdr' ? pfdrTxId || undefined : undefined,
                format,
            });

            setValidationUrl(signed.document?.validationUrl ?? '');
            setSignedHash(signed.prescription?.signatureHash ?? '');
            setPdfBase64(signed.pdfBase64 ?? null);
            toast.success('Receta firmada digitalmente.');
        } catch (error: any) {
            toast.error(error.message ?? 'No se pudo firmar la receta.');
        } finally {
            setIsBusy(false);
        }
    }

    async function handleGetDocument(format: 'json' | 'pdf') {
        if (!prescriptionId) {
            toast.error('Primero crea una receta.');
            return;
        }

        setIsBusy(true);
        try {
            const doc = await getPrescriptionDocument(prescriptionId, format);
            setValidationUrl(doc.validationUrl ?? validationUrl);
            if (format === 'json') {
                toast.success('Documento JSON recuperado.');
            } else {
                toast.success('Documento PDF generado en backend.');
            }
        } catch (error: any) {
            toast.error(error.message ?? 'No se pudo obtener el documento.');
        } finally {
            setIsBusy(false);
        }
    }

    async function handleSignThread() {
        if (!problemId.trim()) {
            toast.error('Debes indicar el ID de problema para firmar el hilo.');
            return;
        }
        if (!doctorLicense.trim()) {
            toast.error('La matrícula del médico es obligatoria para firmar el hilo.');
            return;
        }

        setIsBusy(true);
        try {
            await signProblemThread(problemId, {
                doctorLicense,
                signatureProvider: provider,
                pfdrTransactionId: provider === 'pfdr' ? pfdrTxId || undefined : undefined,
            });
            toast.success('Hilo del problema firmado y bloqueado para inmutabilidad.');
        } catch (error: any) {
            toast.error(error.message ?? 'No se pudo firmar el hilo clínico.');
        } finally {
            setIsBusy(false);
        }
    }

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
            <header>
                <h2 className="text-xl font-bold text-slate-900">Receta Digital y Firma</h2>
                <p className="text-sm text-slate-600 mt-1">
                    Flujo: seleccionar problema activo, elegir DCI, emitir receta, firmar y validar QR.
                </p>
            </header>

            <div className="grid gap-4 md:grid-cols-2">
                <Field label="ID Profesional (obligatorio)">
                    <input value={resolvedProfessionalId} onChange={(e) => setResolvedProfessionalId(e.target.value)} className="input" placeholder="UUID profesional" />
                </Field>
                <Field label="ID Problema Activo (obligatorio)">
                    <input value={problemId} onChange={(e) => setProblemId(e.target.value)} className="input" placeholder="UUID problema" />
                </Field>
                <Field label="Título Diagnóstico (referencia)">
                    <input value={problemTitle} onChange={(e) => setProblemTitle(e.target.value)} className="input" placeholder="Ej: HTA esencial" />
                </Field>
                <Field label="ID Evolución (opcional)">
                    <input value={evolutionId} onChange={(e) => setEvolutionId(e.target.value)} className="input" placeholder="UUID evolución" />
                </Field>
                <Field label="Matrícula Médico (obligatoria)">
                    <input value={doctorLicense} onChange={(e) => setDoctorLicense(e.target.value)} className="input" placeholder="MN 123456" />
                </Field>
            </div>

            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 space-y-3">
                <h3 className="font-semibold text-indigo-900">1) Vademécum (Ley 25.649)</h3>
                <div className="flex gap-2">
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="input flex-1"
                        placeholder="Buscar por DCI o marca"
                    />
                    <button onClick={handleSearch} disabled={isBusy} className="btn-indigo">Buscar</button>
                </div>

                {results.length > 0 && (
                    <div className="grid gap-2 max-h-52 overflow-auto">
                        {results.map((group) => (
                            <div key={group.dciName} className="rounded-lg border border-indigo-100 bg-white p-2">
                                <div className="font-medium text-indigo-900">{group.dciName}</div>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {group.brands.map((brand, idx) => (
                                        <button
                                            key={`${group.dciName}-${idx}`}
                                            className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs hover:bg-indigo-100"
                                            onClick={() => applySelection(group.dciName, brand.brandName, brand.snomedCtArCode)}
                                        >
                                            {brand.brandName || 'Sin marca'} • {brand.snomedCtArCode}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Field label="DCI seleccionada (obligatoria)">
                    <input value={selectedDci} onChange={(e) => setSelectedDci(e.target.value)} className="input" />
                </Field>
                <Field label="Marca (opcional)">
                    <input value={selectedBrand} onChange={(e) => setSelectedBrand(e.target.value)} className="input" />
                </Field>
                <Field label="SNOMED CT AR">
                    <input value={selectedSnomed} onChange={(e) => setSelectedSnomed(e.target.value)} className="input" />
                </Field>
                <Field label="Nombre para receta">
                    <input value={drugName} onChange={(e) => setDrugName(e.target.value)} className="input" />
                </Field>
                <Field label="Dosis">
                    <input value={dose} onChange={(e) => setDose(e.target.value)} className="input" placeholder="Ej: 10 mg" />
                </Field>
                <Field label="Frecuencia">
                    <input value={frequency} onChange={(e) => setFrequency(e.target.value)} className="input" placeholder="Ej: cada 12 h" />
                </Field>
                <Field label="Vía">
                    <input value={route} onChange={(e) => setRoute(e.target.value)} className="input" placeholder="oral" />
                </Field>
                <Field label="Duración (días)">
                    <input type="number" value={durationDays} onChange={(e) => setDurationDays(Number(e.target.value) || 0)} className="input" />
                </Field>
            </div>

            <Field label="Instrucciones al paciente">
                <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} className="input min-h-20" />
            </Field>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
                <h3 className="font-semibold text-emerald-900">2) Emisión de receta</h3>
                <div className="flex flex-wrap gap-2 items-center">
                    <button onClick={handleCreatePrescription} disabled={isBusy} className="btn-emerald">
                        Emitir receta única
                    </button>
                    <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                        <input type="checkbox" checked={isChronic} onChange={(e) => setIsChronic(e.target.checked)} />
                        Problema crónico
                    </label>
                    <input
                        type="number"
                        value={installments}
                        min={1}
                        max={6}
                        onChange={(e) => setInstallments(Number(e.target.value) || 3)}
                        className="input w-24"
                        title="Cuotas mensuales"
                    />
                    <button onClick={handleCreateProlongedPlan} disabled={isBusy || !isChronic} className="btn-emerald">
                        Receta prolongada
                    </button>
                </div>

                <p className="text-xs text-emerald-800">
                    Regla aplicada: no se crea receta sin Problem ID. Si es crónico, puede emitirse plan prolongado mensual.
                </p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                <h3 className="font-semibold text-amber-900">3) Firma digital (Ley 25.506)</h3>
                <div className="grid md:grid-cols-3 gap-3">
                    <Field label="Proveedor de firma">
                        <select value={provider} onChange={(e) => setProvider(e.target.value as SignatureProvider)} className="input">
                            <option value="local_hash">local_hash</option>
                            <option value="pfdr">pfdr</option>
                        </select>
                    </Field>
                    <Field label="PFDR Transaction ID (opcional)">
                        <input value={pfdrTxId} onChange={(e) => setPfdrTxId(e.target.value)} className="input" />
                    </Field>
                    <Field label="ID receta creada">
                        <input value={prescriptionId} onChange={(e) => setPrescriptionId(e.target.value)} className="input" />
                    </Field>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button onClick={() => handleSignPrescription('json')} disabled={isBusy} className="btn-amber">
                        Firmar + JSON
                    </button>
                    <button onClick={() => handleSignPrescription('pdf')} disabled={isBusy} className="btn-amber">
                        Firmar + PDF
                    </button>
                    <button onClick={() => handleGetDocument('json')} disabled={isBusy} className="btn-amber">
                        Ver documento JSON
                    </button>
                    <button onClick={() => handleGetDocument('pdf')} disabled={isBusy} className="btn-amber">
                        Generar PDF
                    </button>
                    <button onClick={handleSignThread} disabled={isBusy} className="btn-amber">
                        Firmar hilo del problema
                    </button>
                </div>
            </div>

            {(validationUrl || signedHash || pdfBase64) && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                    <h3 className="font-semibold text-slate-900">4) Validación y salida</h3>
                    {validationUrl && (
                        <p className="text-sm break-all text-slate-700">
                            URL validación: <a className="text-blue-700 underline" href={validationUrl} target="_blank" rel="noreferrer">{validationUrl}</a>
                        </p>
                    )}
                    {signedHash && <p className="text-xs break-all text-slate-600">Hash firma: {signedHash}</p>}
                    {pdfBase64 && (
                        <details>
                            <summary className="cursor-pointer text-sm text-slate-700">Ver PDF base64</summary>
                            <pre className="mt-2 max-h-40 overflow-auto text-[10px] bg-white p-2 rounded border">{pdfBase64}</pre>
                        </details>
                    )}
                </div>
            )}

            <style jsx>{`
        .input {
          width: 100%;
          border: 1px solid #cbd5e1;
          border-radius: 0.6rem;
          padding: 0.5rem 0.65rem;
          font-size: 0.9rem;
          background: white;
        }
        .btn-indigo {
          border-radius: 0.6rem;
          padding: 0.5rem 0.85rem;
          font-size: 0.9rem;
          font-weight: 600;
          color: white;
          background: #4338ca;
        }
        .btn-emerald {
          border-radius: 0.6rem;
          padding: 0.5rem 0.85rem;
          font-size: 0.9rem;
          font-weight: 600;
          color: white;
          background: #047857;
        }
        .btn-amber {
          border-radius: 0.6rem;
          padding: 0.5rem 0.85rem;
          font-size: 0.9rem;
          font-weight: 600;
          color: white;
          background: #b45309;
        }
        button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
      `}</style>
        </section>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</span>
            {children}
        </label>
    );
}
