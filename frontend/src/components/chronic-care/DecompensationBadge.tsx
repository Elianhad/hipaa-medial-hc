'use client';

import { AlertTriangle, Clock, Pill, Activity } from 'lucide-react';
import { clsx } from 'clsx';

// ── Types ─────────────────────────────────────────────────────────────────────

export type DecompensationStatus =
    | 'none'
    | 'acute_exacerbation'
    | 'hospitalized'
    | 'resolved_decompensation';

export interface ProblemSummary {
    problem_id: string;
    title: string;
    status: string;
    decompensation_status: DecompensationStatus;
    decompensation_started_at: string | null;
    latest_trend: string | null;
    latest_trend_score: number | null;
    overdue_alerts_count: number;
    active_rx_count: number;
    adherence_90d_pct: number | null;
    has_baseline: boolean;
}

interface DecompensationBadgeProps {
    summary: ProblemSummary;
    /** Called when the card is clicked */
    onClick?: (problemId: string) => void;
}

// ── Decompensation level metadata ─────────────────────────────────────────────

const decompMeta: Record<
    DecompensationStatus,
    { label: string; ring: string; bg: string; dot: string } | null
> = {
    none: null,
    acute_exacerbation: {
        label: 'Agudización',
        ring: 'ring-red-500',
        bg: 'bg-red-500/10',
        dot: 'bg-red-500',
    },
    hospitalized: {
        label: 'Hospitalizado',
        ring: 'ring-red-600',
        bg: 'bg-red-600/15',
        dot: 'bg-red-600',
    },
    resolved_decompensation: {
        label: 'Compensado',
        ring: 'ring-emerald-500',
        bg: 'bg-emerald-500/10',
        dot: 'bg-emerald-500',
    },
};

const trendColors: Record<string, string> = {
    improving: 'text-emerald-400',
    stable: 'text-slate-400',
    worsening: 'text-red-400',
    resolution: 'text-sky-400',
};

const trendLabels: Record<string, string> = {
    improving: '↑ Mejorando',
    stable: '→ Estable',
    worsening: '↓ Empeorando',
    resolution: '✓ Resolución',
};

// ─────────────────────────────────────────────────────────────────────────────

export default function DecompensationBadge({
    summary,
    onClick,
}: DecompensationBadgeProps) {
    const decomp = decompMeta[summary.decompensation_status];
    const isAlert = !!decomp && summary.decompensation_status !== 'resolved_decompensation';

    return (
        <button
            onClick={() => onClick?.(summary.problem_id)}
            className={clsx(
                'w-full rounded-xl border p-4 text-left transition hover:ring-1 hover:ring-sky-500',
                decomp
                    ? `ring-1 ${decomp.ring} ${decomp.bg} border-transparent`
                    : 'border-white/10 bg-white/5',
            )}
        >
            {/* Title row */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                    {isAlert && (
                        /* Pulsing red dot for active decompensation */
                        <span className="relative flex h-3 w-3 shrink-0">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                            <span className={clsx('relative inline-flex h-3 w-3 rounded-full', decomp?.dot)} />
                        </span>
                    )}
                    <span className="font-semibold text-white">{summary.title}</span>
                </div>

                {decomp && (
                    <span
                        className={clsx(
                            'shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold',
                            summary.decompensation_status === 'none' || summary.decompensation_status === 'resolved_decompensation'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-red-500/20 text-red-300',
                        )}
                    >
                        {decomp.label}
                    </span>
                )}
            </div>

            {/* Stats row */}
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400">
                {/* Trend */}
                {summary.latest_trend && (
                    <span className={clsx('flex items-center gap-1', trendColors[summary.latest_trend])}>
                        <Activity size={12} />
                        {trendLabels[summary.latest_trend] ?? summary.latest_trend}
                    </span>
                )}

                {/* Overdue alerts */}
                {summary.overdue_alerts_count > 0 && (
                    <span className="flex items-center gap-1 text-amber-400">
                        <Clock size={12} />
                        {summary.overdue_alerts_count} alerta
                        {summary.overdue_alerts_count > 1 ? 's' : ''} vencida
                        {summary.overdue_alerts_count > 1 ? 's' : ''}
                    </span>
                )}

                {/* Active Rx */}
                {summary.active_rx_count > 0 && (
                    <span className="flex items-center gap-1">
                        <Pill size={12} />
                        {summary.active_rx_count} receta
                        {summary.active_rx_count > 1 ? 's' : ''} activa
                        {summary.active_rx_count > 1 ? 's' : ''}
                    </span>
                )}

                {/* Adherence alert */}
                {summary.adherence_90d_pct !== null && summary.adherence_90d_pct < 80 && (
                    <span className="flex items-center gap-1 text-amber-400">
                        <AlertTriangle size={12} />
                        Adherencia {summary.adherence_90d_pct.toFixed(0)}%
                    </span>
                )}
            </div>

            {/* Decompensation date */}
            {isAlert && summary.decompensation_started_at && (
                <p className="mt-2 text-xs text-red-400/80">
                    Desde:{' '}
                    {new Date(summary.decompensation_started_at).toLocaleDateString('es-AR', {
                        dateStyle: 'medium',
                    })}
                </p>
            )}
        </button>
    );
}

// ── List variant: renders multiple badges ─────────────────────────────────────

interface DecompensationBadgeListProps {
    summaries: ProblemSummary[];
    onProblemClick?: (problemId: string) => void;
}

export function DecompensationBadgeList({
    summaries,
    onProblemClick,
}: DecompensationBadgeListProps) {
    if (!summaries.length) {
        return (
            <p className="text-sm text-slate-500">No hay problemas registrados para este paciente.</p>
        );
    }

    // Sort: decompensation first, then overdue alerts, then alphabetical
    const sorted = [...summaries].sort((a, b) => {
        const aScore =
            a.decompensation_status !== 'none' && a.decompensation_status !== 'resolved_decompensation'
                ? 100
                : a.overdue_alerts_count * 10;
        const bScore =
            b.decompensation_status !== 'none' && b.decompensation_status !== 'resolved_decompensation'
                ? 100
                : b.overdue_alerts_count * 10;
        return bScore - aScore;
    });

    return (
        <div className="space-y-3">
            {sorted.map((s) => (
                <DecompensationBadge key={s.problem_id} summary={s} onClick={onProblemClick} />
            ))}
        </div>
    );
}
