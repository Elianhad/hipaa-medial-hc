'use client';

import { useEffect, useState } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ReferenceLine,
    ResponsiveContainer,
    Dot,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';
import axios from 'axios';

// ── Types ─────────────────────────────────────────────────────────────────────

interface TrendPoint {
    date: string;
    trend: string | null;
    score: number | null;
}

export interface TrendChartProps {
    problemId: string;
    problemTitle: string;
    /** Lookback window in days (default 180) */
    days?: number;
}

// ── Score → color & label ────────────────────────────────────────────────────

const trendMeta: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
    worsening: {
        color: '#ef4444',
        label: 'Empeorando',
        icon: <TrendingDown size={14} className="text-red-400" />,
    },
    stable: {
        color: '#94a3b8',
        label: 'Estable',
        icon: <Minus size={14} className="text-slate-400" />,
    },
    improving: {
        color: '#22c55e',
        label: 'Mejorando',
        icon: <TrendingUp size={14} className="text-emerald-400" />,
    },
    resolution: {
        color: '#38bdf8',
        label: 'Resolución',
        icon: <Activity size={14} className="text-sky-400" />,
    },
};

// ── Custom Dot — colored by trend ─────────────────────────────────────────────

const TrendDot = (props: any) => {
    const { cx, cy, payload } = props;
    const color = trendMeta[payload.trend ?? '']?.color ?? '#94a3b8';
    return (
        <circle
            cx={cx}
            cy={cy}
            r={5}
            fill={color}
            stroke="transparent"
            strokeWidth={0}
        />
    );
};

// ── Custom Tooltip ────────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const point: TrendPoint = payload[0].payload;
    const meta = trendMeta[point.trend ?? ''];

    return (
        <div className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white shadow-lg">
            <p className="mb-1 font-mono text-xs text-slate-400">{label}</p>
            <div className="flex items-center gap-2">
                {meta?.icon}
                <span className="font-semibold">{meta?.label ?? point.trend ?? '—'}</span>
                <span className="ml-1 text-slate-400">({point.score ?? '?'})</span>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────

export default function TrendChart({ problemId, problemTitle, days = 180 }: TrendChartProps) {
    const [data, setData] = useState<TrendPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        axios
            .get<TrendPoint[]>(`/api/chronic-care/problems/${problemId}/trend?days=${days}`)
            .then((res) => setData(res.data))
            .catch(() => setError('No se pudo cargar el historial de tendencia.'))
            .finally(() => setLoading(false));
    }, [problemId, days]);

    if (loading) {
        return (
            <div className="flex h-48 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                <p className="text-sm text-slate-400">Cargando gráfica de tendencia...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-48 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/5">
                <p className="text-sm text-red-400">{error}</p>
            </div>
        );
    }

    if (!data.length) {
        return (
            <div className="flex h-48 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                <p className="text-sm text-slate-500">Sin datos de tendencia registrados todavía.</p>
            </div>
        );
    }

    // Format dates for display
    const chartData = data.map((p) => ({
        ...p,
        dateLabel: format(parseISO(p.date), 'd MMM', { locale: es }),
    }));

    // Latest trend
    const latest = data[data.length - 1];
    const latestMeta = trendMeta[latest?.trend ?? ''];

    return (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            {/* Header */}
            <div className="mb-4 flex items-start justify-between">
                <div>
                    <p className="text-xs text-slate-400">Gráfica de Tendencia (Flowsheet)</p>
                    <h3 className="font-semibold text-white">{problemTitle}</h3>
                </div>
                {latestMeta && (
                    <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold">
                        {latestMeta.icon}
                        <span>{latestMeta.label}</span>
                    </div>
                )}
            </div>

            {/* Chart */}
            <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis
                        dataKey="dateLabel"
                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        domain={[-1.5, 2.5]}
                        ticks={[-1, 0, 1, 2]}
                        tickFormatter={(v: number) =>
                            ({ '-1': '↓', 0: '→', 1: '↑', 2: '✓' }[v] ?? '')
                        }
                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={0} stroke="#475569" strokeDasharray="4 2" />
                    <Line
                        type="monotone"
                        dataKey="score"
                        stroke="#38bdf8"
                        strokeWidth={2}
                        dot={<TrendDot />}
                        activeDot={{ r: 7, fill: '#38bdf8', stroke: 'white', strokeWidth: 1.5 }}
                    />
                </LineChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-3">
                {Object.entries(trendMeta).map(([key, { icon, label, color }]) => (
                    <div key={key} className="flex items-center gap-1.5 text-xs text-slate-400">
                        <span style={{ color }}>{icon}</span>
                        {label}
                    </div>
                ))}
            </div>
        </div>
    );
}
