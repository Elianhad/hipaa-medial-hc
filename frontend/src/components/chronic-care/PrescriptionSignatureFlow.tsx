'use client';

import { type ReactNode, useMemo, useState } from 'react';
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
    const inputClass = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-500';
    const buttonPrimaryClass = 'rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60';
    const buttonSecondaryClass = 'rounded-xl border border-sky-300 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-800 transition hover:border-sky-400 disabled:opacity-60';
    const buttonWarmClass = 'rounded-xl border border-amber-300 bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-200 disabled:opacity-60';

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
        <section className="relative space-y-6 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(145deg,rgba(16,185,129,0.04)_0%,rgba(14,165,233,0.03)_40%,rgba(245,158,11,0.04)_100%)]" />
            <header className="space-y-2">
                <h2 className="text-xl font-semibold text-slate-900">Flujo de prescripción</h2>
                <p className="text-sm text-slate-600">
                    Flujo: seleccionar problema activo, elegir DCI, emitir receta, firmar y validar QR.
                </p>
            </header>

            <section className="relative space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 sm:p-5">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-800">Contexto clínico</h3>
                <div className="absolute left-4 right-4 top-0 h-px bg-gradient-to-r from-emerald-400/60 via-emerald-300/20 to-transparent" />
                <div className="grid gap-4 md:grid-cols-2">
                <Field label="ID Profesional (obligatorio)">
                    <input value={resolvedProfessionalId} onChange={(e) => setResolvedProfessionalId(e.target.value)} className={inputClass} placeholder="UUID profesional" />
                </Field>
                <Field label="ID Problema Activo (obligatorio)">
                    <input value={problemId} onChange={(e) => setProblemId(e.target.value)} className={inputClass} placeholder="UUID problema" />
                </Field>
                <Field label="Título Diagnóstico (referencia)">
                    <input value={problemTitle} onChange={(e) => setProblemTitle(e.target.value)} className={inputClass} placeholder="Ej: HTA esencial" />
                </Field>
                <Field label="ID Evolución (opcional)">
                    <input value={evolutionId} onChange={(e) => setEvolutionId(e.target.value)} className={inputClass} placeholder="UUID evolución" />
                </Field>
                <Field label="Matrícula Médico (obligatoria)">
                    <input value={doctorLicense} onChange={(e) => setDoctorLicense(e.target.value)} className={inputClass} placeholder="MN 123456" />
                </Field>
                </div>
            </section>

            <section className="relative space-y-3 rounded-2xl border border-sky-200 bg-sky-50/50 p-4 sm:p-5">
                <h3 className="text-base font-semibold text-sky-900">1) Vademécum (Ley 25.649)</h3>
                <div className="absolute left-4 right-4 top-0 h-px bg-gradient-to-r from-sky-400/60 via-sky-300/20 to-transparent" />
                <div className="flex gap-2">
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className={`${inputClass} flex-1`}
                        placeholder="Buscar por DCI o marca"
                    />
                    <button onClick={handleSearch} disabled={isBusy} className={buttonSecondaryClass}>Buscar</button>
                </div>

                {results.length > 0 && (
                    <div className="grid gap-2 max-h-52 overflow-auto">
                        {results.map((group) => (
                            <div key={group.dciName} className="rounded-lg border border-sky-200/70 bg-white p-2.5">
                                <div className="font-medium text-slate-900">{group.dciName}</div>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {group.brands.map((brand, idx) => (
                                        <button
                                            key={`${group.dciName}-${idx}`}
                                            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:border-slate-400"
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
            </section>

            <section className="relative space-y-4 rounded-2xl border border-violet-200 bg-violet-50/40 p-4 sm:p-5">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-violet-800">Datos de prescripción</h3>
                <div className="absolute left-4 right-4 top-0 h-px bg-gradient-to-r from-violet-400/60 via-violet-300/20 to-transparent" />
                <div className="grid gap-4 md:grid-cols-2">
                <Field label="DCI seleccionada (obligatoria)">
                    <input value={selectedDci} onChange={(e) => setSelectedDci(e.target.value)} className={inputClass} />
                </Field>
                <Field label="Marca (opcional)">
                    <input value={selectedBrand} onChange={(e) => setSelectedBrand(e.target.value)} className={inputClass} />
                </Field>
                <Field label="SNOMED CT AR">
                    <input value={selectedSnomed} onChange={(e) => setSelectedSnomed(e.target.value)} className={inputClass} />
                </Field>
                <Field label="Nombre para receta">
                    <input value={drugName} onChange={(e) => setDrugName(e.target.value)} className={inputClass} />
                </Field>
                <Field label="Dosis">
                    <input value={dose} onChange={(e) => setDose(e.target.value)} className={inputClass} placeholder="Ej: 10 mg" />
                </Field>
                <Field label="Frecuencia">
                    <input value={frequency} onChange={(e) => setFrequency(e.target.value)} className={inputClass} placeholder="Ej: cada 12 h" />
                </Field>
                <Field label="Vía">
                    <input value={route} onChange={(e) => setRoute(e.target.value)} className={inputClass} placeholder="oral" />
                </Field>
                <Field label="Duración (días)">
                    <input type="number" value={durationDays} onChange={(e) => setDurationDays(Number(e.target.value) || 0)} className={inputClass} />
                </Field>
                </div>

                <Field label="Instrucciones al paciente">
                    <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} className={`${inputClass} min-h-20`} />
                </Field>
            </section>

            <section className="relative space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 sm:p-5">
                <h3 className="text-base font-semibold text-emerald-900">2) Emisión de receta</h3>
                <div className="absolute left-4 right-4 top-0 h-px bg-gradient-to-r from-emerald-400/60 via-emerald-300/20 to-transparent" />
                <div className="flex flex-wrap gap-2 items-center">
                    <button onClick={handleCreatePrescription} disabled={isBusy} className={buttonPrimaryClass}>
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
                        className={`${inputClass} w-24`}
                        title="Cuotas mensuales"
                    />
                    <button onClick={handleCreateProlongedPlan} disabled={isBusy || !isChronic} className="rounded-xl border border-emerald-300 bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-900 transition hover:border-emerald-400 disabled:opacity-60">
                        Receta prolongada
                    </button>
                </div>

                <p className="text-xs text-emerald-900/80">
                    Regla aplicada: no se crea receta sin Problem ID. Si es crónico, puede emitirse plan prolongado mensual.
                </p>
            </section>

            <section className="relative space-y-3 rounded-2xl border border-amber-200 bg-amber-50/50 p-4 sm:p-5">
                <h3 className="text-base font-semibold text-amber-900">3) Firma digital (Ley 25.506)</h3>
                <div className="absolute left-4 right-4 top-0 h-px bg-gradient-to-r from-amber-400/60 via-amber-300/20 to-transparent" />
                <div className="grid md:grid-cols-3 gap-3">
                    <Field label="Proveedor de firma">
                        <select value={provider} onChange={(e) => setProvider(e.target.value as SignatureProvider)} className={inputClass}>
                            <option value="local_hash">local_hash</option>
                            <option value="pfdr">pfdr</option>
                        </select>
                    </Field>
                    <Field label="PFDR Transaction ID (opcional)">
                        <input value={pfdrTxId} onChange={(e) => setPfdrTxId(e.target.value)} className={inputClass} />
                    </Field>
                    <Field label="ID receta creada">
                        <input value={prescriptionId} onChange={(e) => setPrescriptionId(e.target.value)} className={inputClass} />
                    </Field>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button onClick={() => handleSignPrescription('json')} disabled={isBusy} className={buttonWarmClass}>
                        Firmar + JSON
                    </button>
                    <button onClick={() => handleSignPrescription('pdf')} disabled={isBusy} className={buttonWarmClass}>
                        Firmar + PDF
                    </button>
                    <button onClick={() => handleGetDocument('json')} disabled={isBusy} className={buttonWarmClass}>
                        Ver documento JSON
                    </button>
                    <button onClick={() => handleGetDocument('pdf')} disabled={isBusy} className={buttonWarmClass}>
                        Generar PDF
                    </button>
                    <button onClick={handleSignThread} disabled={isBusy} className={buttonWarmClass}>
                        Firmar hilo del problema
                    </button>
                </div>
            </section>

            {(validationUrl || signedHash || pdfBase64) && (
                <section className="relative space-y-2 rounded-2xl border border-sky-200 bg-sky-50/60 p-4">
                    <h3 className="font-semibold text-sky-900">4) Validación y salida</h3>
                    <div className="absolute left-4 right-4 top-0 h-px bg-gradient-to-r from-sky-400/60 via-sky-300/20 to-transparent" />
                    {validationUrl && (
                        <p className="text-sm break-all text-slate-700">
                            URL validación: <a className="text-blue-700 underline" href={validationUrl} target="_blank" rel="noreferrer">{validationUrl}</a>
                        </p>
                    )}
                    {signedHash && <p className="text-xs break-all text-slate-600">Hash firma: {signedHash}</p>}
                    {pdfBase64 && (
                        <details>
                            <summary className="cursor-pointer text-sm text-slate-700">Ver PDF base64</summary>
                            <pre className="mt-2 max-h-40 overflow-auto rounded-lg border border-slate-200 bg-white p-2 text-[10px]">{pdfBase64}</pre>
                        </details>
                    )}
                </section>
            )}
        </section>
    );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</span>
            {children}
        </label>
    );
}
