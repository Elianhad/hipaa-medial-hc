'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SnomedHit {
    conceptId: string;
    term: string;
}

interface SnowstormItem {
    concept: { conceptId: string };
    term: string;
}

interface SnowstormResponse {
    items: SnowstormItem[];
}

interface Props {
    /** Current committed conceptId (controlled). */
    value: string;
    onChange: (hit: SnomedHit | null) => void;
    resetKey?: number;
    placeholder?: string;
    required?: boolean;
    /** Extra CSS classes for the wrapper div */
    className?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const SNOWSTORM_BASE =
    'https://browser.ihtsdotools.org/snowstorm/snomed-ct/browser/MAIN/SNOMEDCT-ES/descriptions';

/**
 * conceptEcl=<<404684003 restringe la búsqueda a "Hallazgo clínico" (Clinical finding)
 * y todos sus descendientes en la jerarquía SNOMED CT, excluyendo sustancias,
 * procedimientos, medicamentos y otros conceptos no diagnósticos.
 * El ECL <<404684003 significa: el concepto 404684003 y todos sus subtipos.
 */
const CLINICAL_FINDING_ECL = '<<404684003';

async function searchSnomed(term: string): Promise<SnomedHit[]> {
    const params = new URLSearchParams({
        term,
        active: 'true',
        conceptActive: 'true',
        lang: 'es',
        conceptEcl: CLINICAL_FINDING_ECL,
        limit: '10',
    });
    const res = await fetch(`${SNOWSTORM_BASE}?${params.toString()}`, {
        headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`SNOMED API error ${res.status}`);
    const data: SnowstormResponse = await res.json();
    return (data.items ?? []).map((item) => ({
        conceptId: item.concept.conceptId,
        term: item.term,
    }));
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SnomedAutocomplete({
    value,
    onChange,
    resetKey,
    placeholder = 'Buscar en SNOMED CT…',
    required = false,
    className = '',
}: Props) {
    const [inputText, setInputText] = useState('');
    const [results, setResults] = useState<SnomedHit[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);

    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const isValidated = Boolean(value);

    // ── Reset when resetKey changes ──────────────────────────────────────────
    useEffect(() => {
        setInputText('');
        setResults([]);
        setOpen(false);
        setActiveIndex(-1);
    }, [resetKey]);

    // ── Close on outside click ───────────────────────────────────────────────
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // ── Debounced search ─────────────────────────────────────────────────────
    const handleInputChange = useCallback((raw: string) => {
        setInputText(raw);
        onChange(null); // clear committed value while typing

        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (!raw.trim() || raw.trim().length < 2) {
            setResults([]);
            setOpen(false);
            return;
        }

        debounceRef.current = setTimeout(async () => {
            setLoading(true);
            setError(false);
            try {
                const hits = await searchSnomed(raw.trim());
                setResults(hits);
                setOpen(hits.length > 0);
                setActiveIndex(-1);
            } catch {
                setError(true);
                setResults([]);
                setOpen(false);
            } finally {
                setLoading(false);
            }
        }, 400);
    }, [onChange]);

    // ── Select a hit ─────────────────────────────────────────────────────────
    function selectHit(hit: SnomedHit) {
        setInputText(hit.term);
        setResults([]);
        setOpen(false);
        setActiveIndex(-1);
        onChange(hit);
    }

    // ── Keyboard navigation ───────────────────────────────────────────────────
    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (!open || results.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex((prev) => (prev + 1) % results.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex((prev) => (prev - 1 + results.length) % results.length);
        } else if (e.key === 'Enter' && activeIndex >= 0) {
            e.preventDefault();
            selectHit(results[activeIndex]);
        } else if (e.key === 'Escape') {
            setOpen(false);
        }
    }

    // ── Dynamic border styles ─────────────────────────────────────────────────
    const borderClass = isValidated
        ? 'border-cyan-400 ring-2 ring-cyan-400/40 shadow-[0_0_0_3px_theme(colors.cyan.400/15%)]'
        : error
        ? 'border-red-400'
        : 'border-slate-300 focus-within:border-slate-500';

    return (
        <div ref={wrapperRef} className={`relative ${className}`}>
            <div className={`flex items-center gap-1.5 rounded-xl border bg-white px-3 py-2.5 text-sm transition ${borderClass}`}>
                <input
                    ref={inputRef}
                    type="text"
                    className="flex-1 bg-transparent text-slate-700 outline-none placeholder:text-slate-400"
                    value={inputText}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => results.length > 0 && setOpen(true)}
                    placeholder={placeholder}
                    required={required}
                    autoComplete="off"
                    spellCheck={false}
                />

                {/* Status icons */}
                {loading && (
                    <svg className="size-4 shrink-0 animate-spin text-slate-400" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                )}
                {!loading && isValidated && (
                    <span className="shrink-0 flex items-center gap-1 rounded-full bg-cyan-50 border border-cyan-300 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-600 select-none">
                        <svg className="size-3" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
                        </svg>
                        OK
                    </span>
                )}
                {!loading && error && (
                    <svg className="size-4 shrink-0 text-red-400" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14zM8 4a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4zm0 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
                    </svg>
                )}
            </div>

            {/* Validated concept ID chip */}
            {isValidated && (
                <div className="mt-1 flex items-center gap-1 text-[11px] text-cyan-600">
                    <span className="font-mono font-medium">{value}</span>
                    <button
                        type="button"
                        onClick={() => {
                            setInputText('');
                            onChange(null);
                            inputRef.current?.focus();
                        }}
                        className="ml-1 rounded text-slate-400 hover:text-slate-600 transition"
                        title="Limpiar selección"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Dropdown */}
            {open && results.length > 0 && (
                <ul
                    role="listbox"
                    className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60"
                >
                    {results.map((hit, i) => (
                        <li
                            key={`${hit.conceptId}-${i}`}
                            role="option"
                            aria-selected={i === activeIndex}
                            onMouseDown={(e) => {
                                e.preventDefault(); // prevent blur before click
                                selectHit(hit);
                            }}
                            onMouseEnter={() => setActiveIndex(i)}
                            className={`flex cursor-pointer flex-col gap-0.5 px-3.5 py-2.5 text-sm transition-colors ${
                                i === activeIndex
                                    ? 'bg-cyan-50 text-cyan-900'
                                    : 'text-slate-700 hover:bg-slate-50'
                            } ${i > 0 ? 'border-t border-slate-100' : ''}`}
                        >
                            <span className="font-medium leading-tight">{hit.term}</span>
                            <span className={`font-mono text-[11px] ${i === activeIndex ? 'text-cyan-500' : 'text-slate-400'}`}>
                                {hit.conceptId}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
