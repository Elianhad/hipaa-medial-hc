'use client';

import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import {
    checkProblemDuplicate,
    createProblemWithEvolution,
    discardProblem,
    getProblemsByPatient,
    getProblemTransitions,
    promoteProblem,
    type PatientProblem,
    type ProblemCategory,
    type ProblemVerificationStatus,
    type ProblemTransitionEvent,
} from '@/lib/clinical-problems-api';
import SnomedAutocomplete, { type SnomedHit } from './SnomedAutocomplete';

interface Props {
    patientId: string;
    onProblemsChanged?: (problems: PatientProblem[]) => void;
}

type CodingFilter = 'all' | 'coded' | 'uncoded';

function normalizeCodingFilter(value: string | null): CodingFilter {
    if (value === 'coded' || value === 'uncoded' || value === 'all') {
        return value;
    }
    return 'all';
}

export default function PatientProblemsPanel({ patientId, onProblemsChanged }: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [problems, setProblems] = useState<PatientProblem[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [title, setTitle] = useState('');
    const [snomedCode, setSnomedCode] = useState(''); // conceptId
    const [snomedTerm, setSnomedTerm] = useState('');  // display term
    const [snomedResetKey, setSnomedResetKey] = useState(0);
    const [icd10Code, setIcd10Code] = useState('');
    const [icd11Code, setIcd11Code] = useState('');
    const [currentIllness, setCurrentIllness] = useState('');
    const [objective, setObjective] = useState('');
    const [assessment, setAssessment] = useState('');
    const [plan, setPlan] = useState('');
    const [onsetDate, setOnsetDate] = useState(new Date().toISOString().split('T')[0]);
    const [category, setCategory] = useState<ProblemCategory>('encounter_diagnosis');
    const [verificationStatus, setVerificationStatus] = useState<ProblemVerificationStatus>('provisional');
    const codingFilter = normalizeCodingFilter(searchParams.get('coding'));
    const [currentIllnessResetKey, setCurrentIllnessResetKey] = useState(0);
    const [duplicateWarning, setDuplicateWarning] = useState<PatientProblem | null>(null);
    const [recurrenceOfProblemId, setRecurrenceOfProblemId] = useState<string | undefined>(undefined);

    const [transitionProblemId, setTransitionProblemId] = useState<string | null>(null);
    const [transitions, setTransitions] = useState<ProblemTransitionEvent[]>([]);
    const [loadingTransitions, setLoadingTransitions] = useState(false);

    const [promoteProblemTarget, setPromoteProblemTarget] = useState<PatientProblem | null>(null);
    const [promoteTitle, setPromoteTitle] = useState('');
    const [promoteReason, setPromoteReason] = useState('');
    const [promoteSnomedCode, setPromoteSnomedCode] = useState('');
    const [promoteSnomedTerm, setPromoteSnomedTerm] = useState('');
    const [promoteSnomedResetKey, setPromoteSnomedResetKey] = useState(0);
    const [promoteIcd10Code, setPromoteIcd10Code] = useState('');
    const [promoteIcd11Code, setPromoteIcd11Code] = useState('');

    const [discardProblemTarget, setDiscardProblemTarget] = useState<PatientProblem | null>(null);
    const [discardSummary, setDiscardSummary] = useState('');
    const [discardReason, setDiscardReason] = useState('');

    async function loadProblems() {
        setLoading(true);
        try {
            const data = await getProblemsByPatient(patientId);
            setProblems(data);
            onProblemsChanged?.(data);
        } catch (error: any) {
            toast.error(error.message ?? 'No se pudieron cargar los problemas.');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadProblems();
    }, [patientId]);

    const hasCoding = (problem: PatientProblem) => Boolean(problem.snomedCode || problem.icd10Code || problem.icd11Code);

    const byCodingFilter = (problem: PatientProblem) => {
        if (codingFilter === 'coded') return hasCoding(problem);
        if (codingFilter === 'uncoded') return !hasCoding(problem);
        return true;
    };

    function updateCodingFilter(next: CodingFilter) {
        const params = new URLSearchParams(searchParams.toString());
        if (next === 'all') {
            params.delete('coding');
        } else {
            params.set('coding', next);
        }

        const query = params.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }

    const activeProblems = useMemo(
        () => problems
            .filter((problem) => (['active', 'recurrence'] as string[]).includes(problem.clinicalStatus) && problem.category !== 'problem_list_item')
            .filter(byCodingFilter),
        [problems, codingFilter],
    );

    const chronicProblems = useMemo(
        () => problems
            .filter((problem) => problem.category === 'problem_list_item' && problem.clinicalStatus !== 'resolved')
            .filter(byCodingFilter),
        [problems, codingFilter],
    );

    function handleSnomedChange(hit: SnomedHit | null) {
        const code = hit?.conceptId ?? '';
        const term = hit?.term ?? '';
        setSnomedCode(code);
        setSnomedTerm(term);
        if (code) {
            void runDuplicateCheck(code, icd10Code.trim(), icd11Code.trim());
        } else {
            setDuplicateWarning(null);
        }
    }

    async function runDuplicateCheck(snomed: string, icd10: string, icd11: string) {
        if (!snomed && !icd10 && !icd11) return;
        setDuplicateWarning(null);
        try {
            const dup = await checkProblemDuplicate(patientId, snomed || undefined, icd10 || undefined, icd11 || undefined);
            setDuplicateWarning(dup);
        } catch {
            // non-blocking — dedup check failure should not prevent form submission
            setDuplicateWarning(null);
        }
    }

    async function handleCreateProblem() {
        if (!title.trim()) {
            toast.error('El título del problema es obligatorio.');
            return;
        }
        if (!snomedCode.trim()) {
            toast.error('El código SNOMED es obligatorio.');
            return;
        }

        setSaving(true);
        try {
            await createProblemWithEvolution({
                patientId,
                title: title.trim(),
                category,
                verificationStatus,
                clinicalStatus: recurrenceOfProblemId ? 'recurrence' : 'active',
                snomedCode: snomedCode.trim(),
                icd10Code: icd10Code.trim() || undefined,
                icd11Code: icd11Code.trim() || undefined,
                onsetDate,
                recurrenceOfProblemId,
                subjective: currentIllness || undefined,
                objective: objective || undefined,
                assessment: assessment || undefined,
                plan: plan || undefined,
            });

            toast.success('Problema y registro clínico creados correctamente.');
            setTitle('');
            setSnomedCode('');
            setSnomedTerm('');
            setSnomedResetKey((k) => k + 1);
            setIcd10Code('');
            setIcd11Code('');
            setCurrentIllness('');
            setObjective('');
            setAssessment('');
            setPlan('');
            setCategory('encounter_diagnosis');
            setVerificationStatus('provisional');
            setDuplicateWarning(null);
            setRecurrenceOfProblemId(undefined);
            setCurrentIllnessResetKey((current) => current + 1);
            await loadProblems();
        } catch (error: any) {
            toast.error(error.message ?? 'No se pudo crear el problema.');
        } finally {
            setSaving(false);
        }
    }

    function openPromoteModal(problem: PatientProblem) {
        setPromoteProblemTarget(problem);
        setPromoteTitle(problem.title);
        setPromoteReason('Promoción desde hoja de paciente');
        setPromoteSnomedCode('');
        setPromoteSnomedTerm('');
        setPromoteSnomedResetKey((k) => k + 1);
        setPromoteIcd10Code('');
        setPromoteIcd11Code('');
    }

    function closePromoteModal() {
        setPromoteProblemTarget(null);
        setPromoteTitle('');
        setPromoteReason('');
        setPromoteSnomedCode('');
        setPromoteSnomedTerm('');
        setPromoteSnomedResetKey((k) => k + 1);
        setPromoteIcd10Code('');
        setPromoteIcd11Code('');
    }

    async function submitPromote() {
        if (!promoteProblemTarget) return;
        if (!promoteTitle.trim()) {
            toast.error('El nuevo título clínico es obligatorio.');
            return;
        }

        setSaving(true);
        try {
            await promoteProblem(promoteProblemTarget.id, {
                newTitle: promoteTitle.trim(),
                newCategory: 'problem_list_item',
                newClinicalStatus: 'active',
                snomedCode: promoteSnomedCode.trim() || undefined,
                icd10Code: promoteIcd10Code.trim() || undefined,
                icd11Code: promoteIcd11Code.trim() || undefined,
                reasonNote: promoteReason.trim() || 'Promoción desde hoja de paciente',
            }, patientId);
            toast.success('Problema promovido a crónico.');
            await loadProblems();
            closePromoteModal();
        } catch (error: any) {
            toast.error(error.message ?? 'No se pudo promover el problema.');
        } finally {
            setSaving(false);
        }
    }

    function openDiscardModal(problem: PatientProblem) {
        setDiscardProblemTarget(problem);
        setDiscardSummary('');
        setDiscardReason('Descartado desde hoja de paciente');
    }

    function closeDiscardModal() {
        setDiscardProblemTarget(null);
        setDiscardSummary('');
        setDiscardReason('');
    }

    async function submitDiscard() {
        if (!discardProblemTarget) return;
        if (!discardSummary.trim()) {
            toast.error('El resumen de descarte/cierre es obligatorio.');
            return;
        }

        setSaving(true);
        try {
            await discardProblem(discardProblemTarget.id, {
                closureSummary: discardSummary.trim(),
                reasonNote: discardReason.trim() || 'Descartado desde hoja de paciente',
            }, patientId);
            toast.success('Problema descartado/cerrado.');
            await loadProblems();
            closeDiscardModal();
        } catch (error: any) {
            toast.error(error.message ?? 'No se pudo descartar el problema.');
        } finally {
            setSaving(false);
        }
    }

    async function handleViewTransitions(problemId: string) {
        setTransitionProblemId(problemId);
        setLoadingTransitions(true);
        try {
            const data = await getProblemTransitions(problemId, patientId);
            setTransitions(data);
        } catch (error: any) {
            toast.error(error.message ?? 'No se pudo obtener el historial de transiciones.');
        } finally {
            setLoadingTransitions(false);
        }
    }

    return (
        <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <header className="space-y-2">
                <h2 className="text-xl font-semibold text-slate-900">Problemas del paciente</h2>
                <p className="text-sm text-slate-600">
                    Registro clínico integrado: problema, enfermedad actual, impresión diagnóstica y plan en una sola carga.
                </p>
            </header>

            <section className="space-y-5 rounded-2xl bg-slate-50/70 p-4 sm:p-5">
                <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Problema / motivo de consulta">
                        <input
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-500"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Ej: Cefalea tensional"
                        />
                    </Field>
                    <Field label="Categoría">
                        <select
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-500"
                            value={category}
                            onChange={(e) => setCategory(e.target.value as ProblemCategory)}
                        >
                            <option value="encounter_diagnosis">Diagnóstico del encuentro</option>
                            <option value="problem_list_item">Problema longitudinal</option>
                            <option value="health_concern">Preocupación de salud</option>
                        </select>
                    </Field>
                    <Field label="Estado de verificación">
                        <select
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-500"
                            value={verificationStatus}
                            onChange={(e) => setVerificationStatus(e.target.value as ProblemVerificationStatus)}
                        >
                            <option value="provisional">Presuntivo</option>
                            <option value="differential">Diagnóstico diferencial</option>
                            <option value="confirmed">Confirmado</option>
                        </select>
                    </Field>
                    <Field label="Fecha de inicio">
                        <input
                            type="date"
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-500"
                            value={onsetDate}
                            onChange={(e) => setOnsetDate(e.target.value)}
                        />
                    </Field>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                    <Field label="SNOMED CT *">
                        <SnomedAutocomplete
                            value={snomedCode}
                            onChange={handleSnomedChange}
                            resetKey={snomedResetKey}
                            placeholder="Buscar diagnóstico…"
                            required
                        />
                    </Field>
                    <Field label="ICD-10 (opcional)">
                        <input
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-500"
                            value={icd10Code}
                            onChange={(e) => setIcd10Code(e.target.value)}
                            onBlur={() => runDuplicateCheck(snomedCode.trim(), icd10Code.trim(), icd11Code.trim())}
                            placeholder="Ej: R51"
                        />
                    </Field>
                    <Field label="ICD-11 (opcional)">
                        <input
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-500"
                            value={icd11Code}
                            onChange={(e) => setIcd11Code(e.target.value)}
                            onBlur={() => runDuplicateCheck(snomedCode.trim(), icd10Code.trim(), icd11Code.trim())}
                            placeholder="Ej: 8A80.0"
                        />
                    </Field>
                </div>

                {duplicateWarning && (
                    <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm space-y-2">
                        <p className="font-semibold text-amber-800">
                            ⚠ Problema similar activo: <span className="font-bold">{duplicateWarning.title}</span>
                        </p>
                        <p className="text-amber-700 text-xs">
                            Encontrado con el mismo código. Podés continuar como nuevo problema, registrarlo como recidiva del existente, o cancelar.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                className="rounded-md bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800"
                                onClick={() => {
                                    setRecurrenceOfProblemId(duplicateWarning.id);
                                    setDuplicateWarning(null);
                                    toast('Registrando como recidiva del problema existente.', { icon: '🔄' });
                                }}
                            >
                                Registrar como recidiva
                            </button>
                            <button
                                type="button"
                                className="rounded-md bg-white border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                onClick={() => setDuplicateWarning(null)}
                            >
                                Crear como nuevo problema
                            </button>
                        </div>
                        {recurrenceOfProblemId && (
                            <p className="text-xs text-amber-700 font-medium">
                                Recidiva del problema ID: {recurrenceOfProblemId}
                                {' '}
                                <button
                                    type="button"
                                    className="underline text-amber-900 ml-1"
                                    onClick={() => setRecurrenceOfProblemId(undefined)}
                                >
                                    Quitar
                                </button>
                            </p>
                        )}
                    </div>
                )}

             

                <RichTextEditorField
                    label="Enfermedad actual"
                    helper="Texto rico para anamnesis breve y relato clínico de la consulta actual."
                    placeholder={"MC: ...\nEA: ..."}
                    resetKey={currentIllnessResetKey}
                    onChange={setCurrentIllness}
                />

                <Field label="Examen físico / Hallazgos objetivos">
                    <textarea
                        className="min-h-20 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-500"
                        value={objective}
                        onChange={(e) => setObjective(e.target.value)}
                        placeholder="Signos vitales, hallazgos del examen físico"
                    />
                </Field>
                <Field label="Impresión diagnóstica">
                    <textarea
                        className="min-h-24 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-500"
                        value={assessment}
                        onChange={(e) => setAssessment(e.target.value)}
                        placeholder="Dx presuntivo o definitivo"
                    />
                </Field>

                <Field label="Plan">
                    <textarea
                        className="min-h-28 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-500"
                        value={plan}
                        onChange={(e) => setPlan(e.target.value)}
                        placeholder="Conducta, medicación, estudios, controles y educación"
                    />
                </Field>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-2">
                    <p className="text-xs text-slate-500">
                        {recurrenceOfProblemId
                            ? 'Se registrará como recidiva del problema existente.'
                            : 'Se registrarán problema, evolución clínica y plan terapéutico en la misma acción.'}
                    </p>
                    <button disabled={saving} onClick={handleCreateProblem} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60">
                        {saving ? 'Guardando...' : 'Registrar problema de la consulta'}
                    </button>
                </div>
            </section>

            <div className="rounded-xl bg-slate-50/80 p-3.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">
                    Filtro por codificación
                </p>
                <div className="flex flex-wrap gap-2">
                    <button
                        className={`rounded-md px-3 py-1.5 text-xs font-semibold ${codingFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 border border-slate-300'}`}
                        onClick={() => updateCodingFilter('all')}
                        type="button"
                    >
                        Todos
                    </button>
                    <button
                        className={`rounded-md px-3 py-1.5 text-xs font-semibold ${codingFilter === 'coded' ? 'bg-emerald-700 text-white' : 'bg-white text-slate-700 border border-slate-300'}`}
                        onClick={() => updateCodingFilter('coded')}
                        type="button"
                    >
                        Con codificación
                    </button>
                    <button
                        className={`rounded-md px-3 py-1.5 text-xs font-semibold ${codingFilter === 'uncoded' ? 'bg-amber-700 text-white' : 'bg-white text-slate-700 border border-slate-300'}`}
                        onClick={() => updateCodingFilter('uncoded')}
                        type="button"
                    >
                        Sin codificación
                    </button>
                </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <ProblemColumn
                    title="Activos"
                    subtitle="Diagnósticos del encuentro y preocupaciones de salud en curso"
                    emptyText="No hay problemas activos."
                    loading={loading}
                    items={activeProblems}
                    onPromote={openPromoteModal}
                    onDiscard={openDiscardModal}
                    onViewTransitions={handleViewTransitions}
                    disableActions={saving}
                    showPromote
                />

                <ProblemColumn
                    title="Longitudinales"
                    subtitle="Lista de problemas de seguimiento crónico"
                    emptyText="No hay problemas longitudinales activos."
                    loading={loading}
                    items={chronicProblems}
                    onPromote={openPromoteModal}
                    onDiscard={openDiscardModal}
                    onViewTransitions={handleViewTransitions}
                    disableActions={saving}
                    showPromote={false}
                />
            </div>

            {transitionProblemId && (
                <div className="space-y-2 rounded-xl bg-slate-50/80 p-4">
                    <h3 className="font-medium text-slate-800">Historial de transiciones del problema</h3>
                    {loadingTransitions && <p className="text-sm text-slate-500">Cargando historial...</p>}
                    {!loadingTransitions && transitions.length === 0 && (
                        <p className="text-sm text-slate-500">Sin transiciones registradas.</p>
                    )}
                    {!loadingTransitions && transitions.length > 0 && (
                        <ul className="space-y-2">
                            {transitions.map((event) => (
                                <li key={event.id} className="rounded-lg border border-slate-200/80 bg-white p-2 text-sm">
                                    <div className="font-medium text-slate-800">{event.transitionType}</div>
                                    <div className="text-slate-600">
                                        {event.fromTitle || '-'} -&gt; {event.toTitle || '-'}
                                    </div>
                                    {event.reasonNote && <div className="text-xs text-slate-500">Motivo: {event.reasonNote}</div>}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {promoteProblemTarget && (
                <ModalFrame title="Promover problema a crónico" onClose={closePromoteModal}>
                    <div className="space-y-3">
                        <p className="text-sm text-slate-600">
                            Problema seleccionado: <span className="font-semibold text-slate-800">{promoteProblemTarget.title}</span>
                        </p>
                        <Field label="Nuevo título clínico">
                            <input
                                className="input"
                                value={promoteTitle}
                                onChange={(e) => setPromoteTitle(e.target.value)}
                                placeholder="Ej: Diabetes mellitus tipo 2"
                            />
                        </Field>
                        <Field label="Motivo de promoción">
                            <textarea
                                className="input min-h-20"
                                value={promoteReason}
                                onChange={(e) => setPromoteReason(e.target.value)}
                                placeholder="Confirmación diagnóstica, evolución, estudios, etc."
                            />
                        </Field>
                        <div className="grid gap-3 md:grid-cols-3">
                            <Field label="SNOMED (opcional)">
                                <SnomedAutocomplete
                                    value={promoteSnomedCode}
                                    onChange={(hit) => {
                                        setPromoteSnomedCode(hit?.conceptId ?? '');
                                        setPromoteSnomedTerm(hit?.term ?? '');
                                    }}
                                    resetKey={promoteSnomedResetKey}
                                    placeholder="Buscar diagnóstico…"
                                />
                            </Field>
                            <Field label="ICD-10 (opcional)">
                                <input
                                    className="input"
                                    value={promoteIcd10Code}
                                    onChange={(e) => setPromoteIcd10Code(e.target.value)}
                                    placeholder="Ej: E11.9"
                                />
                            </Field>
                            <Field label="ICD-11 (opcional)">
                                <input
                                    className="input"
                                    value={promoteIcd11Code}
                                    onChange={(e) => setPromoteIcd11Code(e.target.value)}
                                    placeholder="Ej: 5A11"
                                />
                            </Field>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                                onClick={closePromoteModal}
                                disabled={saving}
                            >
                                Cancelar
                            </button>
                            <button
                                className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                                onClick={submitPromote}
                                disabled={saving}
                            >
                                {saving ? 'Guardando...' : 'Confirmar promoción'}
                            </button>
                        </div>
                    </div>
                </ModalFrame>
            )}

            {discardProblemTarget && (
                <ModalFrame title="Descartar o cerrar problema" onClose={closeDiscardModal}>
                    <div className="space-y-3">
                        <p className="text-sm text-slate-600">
                            Problema seleccionado: <span className="font-semibold text-slate-800">{discardProblemTarget.title}</span>
                        </p>
                        <Field label="Resumen de descarte/cierre">
                            <textarea
                                className="input min-h-24"
                                value={discardSummary}
                                onChange={(e) => setDiscardSummary(e.target.value)}
                                placeholder="Explicación clínica del cierre del problema"
                            />
                        </Field>
                        <Field label="Motivo interno (opcional)">
                            <input
                                className="input"
                                value={discardReason}
                                onChange={(e) => setDiscardReason(e.target.value)}
                                placeholder="Ej: diagnóstico descartado por estudios complementarios"
                            />
                        </Field>
                        <div className="flex justify-end gap-2">
                            <button
                                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                                onClick={closeDiscardModal}
                                disabled={saving}
                            >
                                Cancelar
                            </button>
                            <button
                                className="rounded-md bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                                onClick={submitDiscard}
                                disabled={saving}
                            >
                                {saving ? 'Guardando...' : 'Confirmar descarte/cierre'}
                            </button>
                        </div>
                    </div>
                </ModalFrame>
            )}
        </section>
    );
}

function ProblemColumn({
    title,
    subtitle,
    emptyText,
    loading,
    items,
    onPromote,
    onDiscard,
    onViewTransitions,
    disableActions,
    showPromote,
}: {
    title: string;
    subtitle: string;
    emptyText: string;
    loading: boolean;
    items: PatientProblem[];
    onPromote: (problem: PatientProblem) => void;
    onDiscard: (problem: PatientProblem) => void;
    onViewTransitions: (problemId: string) => void;
    disableActions: boolean;
    showPromote: boolean;
}) {
    return (
        <section className="space-y-3 rounded-xl bg-slate-50/80 p-4">
            <div>
                <h3 className="font-semibold text-slate-800">{title}</h3>
                <p className="text-xs text-slate-500">{subtitle}</p>
            </div>

            {loading && <p className="text-sm text-slate-500">Cargando...</p>}

            {!loading && items.length === 0 && <p className="text-sm text-slate-500">{emptyText}</p>}

            {!loading && items.length > 0 && (
                <ul className="space-y-2">
                    {items.map((problem) => (
                        <li key={problem.id} className="space-y-2 rounded-lg border border-slate-200/80 bg-white p-3">
                            <div className="flex items-start gap-2">
                                <div className="flex-1">
                                    <p className="font-medium text-slate-900">{problem.title}</p>
                                    <p className="text-xs text-slate-600">{problem.id}</p>
                                    {(problem.snomedCode || problem.icd10Code || problem.icd11Code) && (
                                        <div className="mt-1 flex flex-wrap gap-1.5">
                                            {problem.snomedCode && (
                                                <span className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[11px] text-blue-700">
                                                    SNOMED {problem.snomedCode}
                                                </span>
                                            )}
                                            {problem.icd10Code && (
                                                <span className="rounded-full bg-violet-50 border border-violet-200 px-2 py-0.5 text-[11px] text-violet-700">
                                                    ICD-10 {problem.icd10Code}
                                                </span>
                                            )}
                                            {problem.icd11Code && (
                                                <span className="rounded-full bg-teal-50 border border-teal-200 px-2 py-0.5 text-[11px] text-teal-700">
                                                    ICD-11 {problem.icd11Code}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <span className="rounded-full bg-white border border-slate-300 px-2 py-1 text-xs text-slate-700">
                                    {problem.category === 'encounter_diagnosis' ? 'Dx del encuentro'
                                        : problem.category === 'problem_list_item' ? 'Longitudinal'
                                        : problem.category === 'health_concern' ? 'Preocupación'
                                        : problem.category}
                                </span>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {showPromote && problem.category !== 'problem_list_item' && (
                                    <button
                                        className="rounded-md bg-indigo-600 px-2 py-1 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                                        disabled={disableActions || problem.isThreadLocked}
                                        onClick={() => onPromote(problem)}
                                    >
                                        Promover a crónico
                                    </button>
                                )}
                                <button
                                    className="rounded-md bg-rose-600 px-2 py-1 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                                    disabled={disableActions || problem.isThreadLocked}
                                    onClick={() => onDiscard(problem)}
                                >
                                    Descartar/Cerrar
                                </button>
                                <button
                                    className="rounded-md bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-300"
                                    onClick={() => onViewTransitions(problem.id)}
                                >
                                    Ver historial
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">{label}</span>
            {children}
        </label>
    );
}

function RichTextEditorField({
    label,
    helper,
    placeholder,
    resetKey,
    onChange,
}: {
    label: string;
    helper?: string;
    placeholder: string;
    resetKey: number;
    onChange: (value: string) => void;
}) {
    const editorRef = useRef<HTMLDivElement | null>(null);
    const [isEmpty, setIsEmpty] = useState(true);
    const toolbarButtonClass = 'rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-400 hover:bg-slate-50';

    useEffect(() => {
        const editor = editorRef.current;
        if (!editor) return;
        editor.innerHTML = '';
        setIsEmpty(true);
    }, [resetKey]);

    function syncValue() {
        const editor = editorRef.current;
        if (!editor) return;
        const plainText = editor.innerText.replace(/\u00a0/g, ' ').trim();
        setIsEmpty(plainText.length === 0);
        onChange(plainText);
    }

    function runCommand(command: 'bold' | 'italic' | 'insertUnorderedList' | 'insertOrderedList') {
        const editor = editorRef.current;
        if (!editor) return;
        editor.focus();
        document.execCommand(command, false);
        syncValue();
    }

    function clearEditor() {
        const editor = editorRef.current;
        if (!editor) return;
        editor.innerHTML = '';
        setIsEmpty(true);
        onChange('');
    }

    return (
        <div className="space-y-2">
            <div>
                <p className="text-sm font-medium text-slate-700">{label}</p>
                {helper && <p className="text-xs text-slate-500">{helper}</p>}
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
                <div className="flex flex-wrap gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
                    <button type="button" className={toolbarButtonClass} onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand('bold')}>
                        Negrita
                    </button>
                    <button type="button" className={toolbarButtonClass} onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand('italic')}>
                        Cursiva
                    </button>
                    <button type="button" className={toolbarButtonClass} onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand('insertUnorderedList')}>
                        Lista
                    </button>
                    <button type="button" className={toolbarButtonClass} onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand('insertOrderedList')}>
                        Numerada
                    </button>
                    <button type="button" className={toolbarButtonClass} onClick={clearEditor}>
                        Limpiar
                    </button>
                </div>

                <div className="relative">
                    {isEmpty && (
                        <p className="pointer-events-none absolute left-4 top-3 whitespace-pre-line text-sm leading-6 text-slate-400">
                            {placeholder}
                        </p>
                    )}
                    <div
                        ref={editorRef}
                        contentEditable
                        suppressContentEditableWarning
                        onInput={syncValue}
                        className="min-h-36 px-4 py-3 text-sm leading-6 text-slate-700 focus:outline-none"
                    />
                </div>
            </div>
        </div>
    );
}

function ModalFrame({
    title,
    onClose,
    children,
}: {
    title: string;
    onClose: () => void;
    children: ReactNode;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="w-full max-w-xl rounded-xl bg-white p-5 shadow-xl border border-slate-200">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
                    <button
                        onClick={onClose}
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                    >
                        Cerrar
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}