import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';

type Tone = 'brand' | 'teal' | 'amber' | 'rose' | 'violet' | 'slate';

const tones: Record<Tone, { chip: string; line: string }> = {
  // One brand look (#00628B on white); tones alternate solid and light chips for rhythm.
  brand: { chip: 'bg-brand-600 text-white', line: '#00628B' },
  teal: { chip: 'bg-brand-50 text-brand-600', line: '#00628B' },
  amber: { chip: 'bg-brand-600 text-white', line: '#00628B' },
  rose: { chip: 'bg-brand-50 text-brand-600', line: '#00628B' },
  violet: { chip: 'bg-brand-50 text-brand-600', line: '#00628B' },
  slate: { chip: 'bg-brand-50 text-brand-600', line: '#00628B' },
};

export interface StatTrend {
  /** Percentage change; null when there is nothing to compare with. */
  value: number | null;
  /** e.g. "vs previous 30 days" */
  label?: string;
  /** Set false for metrics where going down is good (e.g. cancellations). */
  upIsGood?: boolean;
}

export interface StatCardProps {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  hint?: ReactNode;
  trend?: StatTrend;
  tone?: Tone;
  /** Small trend line under the value. */
  sparkline?: number[];
  to?: string;
  loading?: boolean;
  className?: string;
}

function TrendBadge({ value, label, upIsGood = true }: StatTrend) {
  if (value === null) return <p className="text-xs text-slate-500">New this period{label ? ` · ${label}` : ''}</p>;
  const rounded = Math.round(value);
  const flat = rounded === 0;
  const up = rounded > 0;
  const good = flat ? null : up === upIsGood;
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  return (
    <p className="flex flex-wrap items-center gap-x-1.5 text-xs">
      <span className={cn('inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-semibold', good === null ? 'bg-slate-100 text-slate-600' : good ? 'bg-brand-50 text-brand-600' : 'bg-slate-100 text-slate-700')}>
        <Icon className="h-3.5 w-3.5" aria-hidden />
        <span className="sr-only">{flat ? 'No change' : up ? 'Up' : 'Down'}</span>
        {Math.abs(rounded)}%
      </span>
      {label && <span className="text-slate-500">{label}</span>}
    </p>
  );
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;
  const w = 120;
  const h = 32;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - 3 - ((v - min) / span) * (h - 6)] as const);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const id = `spark-${color.slice(1)}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-8 w-full" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.18} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={`${line} L${w},${h} L0,${h} Z`} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** KPI tile used at the top of every dashboard page. */
export function StatCard({ label, value, icon: Icon, hint, trend, tone = 'brand', sparkline, to, loading, className }: StatCardProps) {
  const t = tones[tone];
  const body = (
    <div className={cn('flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 transition-[border-color,box-shadow]', to && 'hover:border-brand-300 hover:shadow-[0_8px_24px_-16px_rgba(0,59,83,.35)]', className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', t.chip)}><Icon className="h-5 w-5" aria-hidden /></span>
      </div>
      {loading ? (
        <div className="mt-1 space-y-2" aria-label="Loading">
          <div className="h-8 w-24 animate-pulse rounded-lg bg-slate-200/70" />
          <div className="h-3 w-32 animate-pulse rounded bg-slate-200/70" />
        </div>
      ) : (
        <>
          <p className="-mt-1 font-display text-[28px] font-bold leading-tight tracking-tight text-ink">{value}</p>
          {sparkline && <div className="mt-2"><Sparkline values={sparkline} color={t.line} /></div>}
          <div className="mt-auto space-y-1 pt-2">
            {trend && <TrendBadge {...trend} />}
            {hint && <p className="text-xs text-slate-500">{hint}</p>}
          </div>
        </>
      )}
    </div>
  );
  return to ? <Link to={to} className="block h-full rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600">{body}</Link> : body;
}

const cols = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 xl:grid-cols-3',
  4: 'sm:grid-cols-2 xl:grid-cols-4',
  5: 'sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5',
};

export function StatGrid({ children, columns = 4, className }: { children: ReactNode; columns?: keyof typeof cols; className?: string }) {
  return <div className={cn('grid grid-cols-1 gap-4', cols[columns], className)}>{children}</div>;
}
