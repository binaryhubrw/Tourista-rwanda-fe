import { useId, type ReactNode } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
  type TooltipProps,
} from 'recharts';
import { cn } from '@/utils/cn';

/**
 * Series colours: the #00628B brand ramp, alternating dark and light so
 * neighbours stay distinct. Charts always label series (legend or values),
 * so identity never depends on colour alone. Assign in order; never cycle.
 */
export const SERIES = ['#00628B', '#99C9DC', '#003B53', '#5FA9C6', '#2A87AB', '#CCE4EE'] as const;

/** Booking-state colours (brand solid / brand light / neutral). Always shown with a text label. */
export const STATUS_COLORS = { good: '#00628B', warning: '#99C9DC', critical: '#94a3b8', neutral: '#cbd5e1' } as const;

const GRID = '#eef1f4';
const AXIS = { fontSize: 12, fill: '#64748b' };

export type Formatter = (value: number) => string;
const plain: Formatter = (v) => v.toLocaleString();

export interface Series {
  key: string;
  label: string;
  color?: string;
}

/* ------------------------------------------------------------------ card */

export function ChartCard({ title, description, action, children, className, footer }: { title: string; description?: string; action?: ReactNode; children: ReactNode; className?: string; footer?: ReactNode }) {
  return (
    <section className={cn('flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 sm:p-5', className)}>
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
          {description && <p className="text-sm text-slate-500">{description}</p>}
        </div>
        {action}
      </header>
      <div className="min-w-0 flex-1">{children}</div>
      {footer && <div className="mt-4 border-t border-slate-100 pt-3 text-sm text-slate-600">{footer}</div>}
    </section>
  );
}

/* --------------------------------------------------------------- tooltip */

function ChartTooltip({ active, payload, label, formatter }: TooltipProps<number, string> & { formatter: Formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-[150px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-lift">
      {label !== undefined && <p className="mb-1 font-semibold text-ink">{label}</p>}
      <ul className="space-y-0.5">
        {payload.map((p) => (
          <li key={String(p.dataKey ?? p.name)} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: (p.payload?.fill as string) ?? p.color }} aria-hidden />
              {p.name}
            </span>
            <span className="font-semibold tabular-nums text-ink">{formatter(Number(p.value))}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string; value?: string }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-slate-600">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: i.color }} aria-hidden />
          {i.label}
          {i.value && <span className="font-semibold text-ink">{i.value}</span>}
        </li>
      ))}
    </ul>
  );
}

const colorOf = (s: Series, i: number) => s.color ?? SERIES[i];

/* ------------------------------------------------------------ area/trend */

export function TrendChart<T extends object>({ data, xKey, series, height = 280, valueFormatter = plain, axisFormatter }: { data: T[]; xKey: keyof T & string; series: Series[]; height?: number; valueFormatter?: Formatter; axisFormatter?: Formatter }) {
  const uid = useId().replace(/:/g, '');
  return (
    <div>
      {series.length > 1 && <div className="mb-3"><Legend items={series.map((s, i) => ({ label: s.label, color: colorOf(s, i) }))} /></div>}
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
          <defs>
            {series.map((s, i) => (
              <linearGradient key={s.key} id={`${uid}-${s.key}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={colorOf(s, i)} stopOpacity={series.length > 1 ? 0.12 : 0.2} />
                <stop offset="100%" stopColor={colorOf(s, i)} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey={xKey} tick={AXIS} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} width={56} tickFormatter={axisFormatter ?? valueFormatter} />
          <Tooltip content={<ChartTooltip formatter={valueFormatter} />} cursor={{ stroke: '#94a3b8', strokeDasharray: '4 4' }} />
          {series.map((s, i) => (
            <Area key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={colorOf(s, i)} strokeWidth={2} fill={`url(#${uid}-${s.key})`} activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }} dot={false} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------------------------------------------------------- bar */

export function BarsChart<T extends object>({ data, xKey, series, height = 280, layout = 'horizontal', stacked = false, valueFormatter = plain, axisFormatter, categoryWidth = 120 }: {
  data: T[]; xKey: keyof T & string; series: Series[]; height?: number; layout?: 'horizontal' | 'vertical'; stacked?: boolean; valueFormatter?: Formatter; axisFormatter?: Formatter; categoryWidth?: number;
}) {
  const vertical = layout === 'vertical';
  return (
    <div>
      {series.length > 1 && <div className="mb-3"><Legend items={series.map((s, i) => ({ label: s.label, color: colorOf(s, i) }))} /></div>}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout={vertical ? 'vertical' : 'horizontal'} margin={{ left: 0, right: 12, top: 8, bottom: 0 }} barGap={2} barCategoryGap={vertical ? '28%' : '24%'}>
          <CartesianGrid stroke={GRID} horizontal={!vertical} vertical={vertical} />
          {vertical ? (
            <>
              <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} tickFormatter={axisFormatter ?? valueFormatter} />
              <YAxis type="category" dataKey={xKey} tick={AXIS} tickLine={false} axisLine={false} width={categoryWidth} tickFormatter={(v: string) => (v.length > 18 ? `${v.slice(0, 17)}…` : v)} />
            </>
          ) : (
            <>
              <XAxis dataKey={xKey} tick={AXIS} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} width={56} tickFormatter={axisFormatter ?? valueFormatter} />
            </>
          )}
          <Tooltip content={<ChartTooltip formatter={valueFormatter} />} cursor={{ fill: '#E8F2F6', opacity: 0.6 }} />
          {series.map((s, i) => {
            const last = i === series.length - 1;
            const radius: [number, number, number, number] = !stacked || last ? (vertical ? [0, 4, 4, 0] : [4, 4, 0, 0]) : [0, 0, 0, 0];
            return <Bar key={s.key} dataKey={s.key} name={s.label} fill={colorOf(s, i)} stackId={stacked ? 'stack' : undefined} radius={radius} maxBarSize={vertical ? 18 : 36} stroke={stacked ? '#fff' : undefined} strokeWidth={stacked ? 1 : 0} />;
          })}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ----------------------------------------------------------------- donut */

export interface Slice { name: string; value: number; color?: string }

export function DonutChart({ data, height = 220, valueFormatter = plain, centerLabel, centerValue }: { data: Slice[]; height?: number; valueFormatter?: Formatter; centerLabel?: string; centerValue?: string }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  // Colours are never cycled: past the palette, the tail folds into a neutral "Other".
  const folded = data.length > SERIES.length
    ? [...data.slice(0, SERIES.length - 1), { name: 'Other', value: data.slice(SERIES.length - 1).reduce((s, d) => s + d.value, 0), color: STATUS_COLORS.neutral }]
    : data;
  const slices = folded.map((d, i) => ({ ...d, fill: d.color ?? SERIES[i] }));
  if (!total) return <p className="grid place-items-center text-sm text-slate-500" style={{ height }}>No data yet</p>;
  return (
    <div className="flex flex-col gap-4">
      <div className="relative" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={slices} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="92%" paddingAngle={slices.length > 1 ? 2 : 0} stroke="#fff" strokeWidth={2} startAngle={90} endAngle={-270}>
              {slices.map((s) => <Cell key={s.name} fill={s.fill} />)}
            </Pie>
            <Tooltip content={<ChartTooltip formatter={valueFormatter} />} />
          </PieChart>
        </ResponsiveContainer>
        {(centerValue || centerLabel) && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
            <div>
              {centerValue && <p className="font-display text-2xl font-bold text-ink">{centerValue}</p>}
              {centerLabel && <p className="text-xs text-slate-500">{centerLabel}</p>}
            </div>
          </div>
        )}
      </div>
      {/* Legend doubles as the data table: name, value and share are always visible. */}
      <ul className="space-y-2 text-sm">
        {slices.map((s) => (
          <li key={s.name} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.fill }} aria-hidden />
            <span className="min-w-0 flex-1 truncate text-slate-600" title={s.name}>{s.name}</span>
            <span className="font-semibold tabular-nums text-ink">{valueFormatter(s.value)}</span>
            <span className="w-10 text-right tabular-nums text-slate-500">{Math.round((s.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------------------------------------------------- ranked list */

/** Horizontal bar list for top-N rankings; every value is labelled. */
export function RankedList({ data, valueFormatter = plain, color = SERIES[0], max: maxItems = 6 }: { data: { name: string; value: number; hint?: string }[]; valueFormatter?: Formatter; color?: string; max?: number }) {
  const rows = data.slice(0, maxItems);
  const max = Math.max(...rows.map((r) => r.value), 1);
  if (!rows.length) return <p className="py-8 text-center text-sm text-slate-500">No data yet</p>;
  return (
    <ol className="space-y-3.5">
      {rows.map((r, i) => (
        <li key={r.name}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-medium text-ink"><span className="mr-2 tabular-nums text-slate-400">{i + 1}</span>{r.name}</span>
            <span className="shrink-0 font-semibold tabular-nums text-ink">{valueFormatter(r.value)}</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: color }} />
          </div>
          {r.hint && <p className="mt-1 text-xs text-slate-500">{r.hint}</p>}
        </li>
      ))}
    </ol>
  );
}
