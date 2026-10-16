import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/utils/cn';
import { addDaysIso } from '@/utils/pricing';
import { formatDate, todayIso } from '@/utils/format';

const weekdays = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function monthStart(iso: string) {
  return `${iso.slice(0, 7)}-01`;
}

function addMonths(iso: string, delta: number) {
  const d = new Date(`${iso}T00:00:00`);
  d.setMonth(d.getMonth() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function addYears(iso: string, delta: number) {
  const d = new Date(`${iso}T00:00:00`);
  d.setFullYear(d.getFullYear() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function daysInMonth(start: string) {
  const first = new Date(`${start}T00:00:00`);
  const weekday = (first.getDay() + 6) % 7;
  const end = addMonths(start, 1);
  const cells: (string | null)[] = Array.from({ length: weekday }, () => null);
  for (let day = start; day < end; day = addDaysIso(day, 1)) cells.push(day);
  while (cells.length % 7) cells.push(null);
  return cells;
}

interface Props {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  min?: string;
  max?: string;
  /** Return true to disable that calendar day. */
  isDisabled?: (iso: string) => boolean;
  /** Shade days between these two dates to preview the selected range. */
  rangeStart?: string;
  rangeEnd?: string;
  hint?: string;
  error?: string;
  className?: string;
}

export function CalendarCard({ label, value, onChange, min = todayIso(), max, isDisabled, rangeStart, rangeEnd, hint, error, className }: Props) {
  const [cursor, setCursor] = useState(() => monthStart(value || min || todayIso()));
  const cells = useMemo(() => daysInMonth(cursor), [cursor]);

  const cursorYear = Number(cursor.slice(0, 4));
  const cursorMonth = Number(cursor.slice(5, 7)) - 1;
  const minMonth = (min || todayIso()).slice(0, 7);
  const minYear = Number(minMonth.slice(0, 4));
  const cantGoBack = cursor.slice(0, 7) <= minMonth;
  const cantGoBackYear = cursorYear <= minYear;
  const lastYear = Math.max(minYear + 8, cursorYear + 1);
  const years = Array.from({ length: lastYear - Math.min(minYear, cursorYear) + 1 }, (_, i) => Math.min(minYear, cursorYear) + i);

  const between = (iso: string) => Boolean(rangeStart && rangeEnd && iso > rangeStart && iso < rangeEnd);
  const navBtn = 'grid h-8 w-8 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent';

  return (
    <div className={cn('rounded-2xl border bg-white p-4', error ? 'border-red-400' : 'border-slate-200', className)}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-ink">{label}</p>
        <p className="text-sm tabular-nums text-slate-600">{value ? formatDate(value, { day: 'numeric', month: 'short', year: 'numeric' }) : 'Select a date'}</p>
      </div>
      <div className="mt-3 flex items-center justify-between gap-1">
        <div className="flex items-center">
          <button type="button" className={navBtn} onClick={() => setCursor(addYears(cursor, -1))} disabled={cantGoBackYear} title="Previous year" aria-label={`Previous year, ${label}`}><ChevronsLeft className="h-4 w-4" /></button>
          <button type="button" className={navBtn} onClick={() => setCursor(addMonths(cursor, -1))} disabled={cantGoBack} title="Previous month" aria-label={`Previous month, ${label}`}><ChevronLeft className="h-4 w-4" /></button>
        </div>
        <div className="flex items-center gap-1">
          <select
            value={cursorMonth}
            onChange={(e) => setCursor(`${cursorYear}-${String(Number(e.target.value) + 1).padStart(2, '0')}-01`)}
            aria-label={`${label} month`}
            className="rounded-lg bg-transparent py-1 pl-1.5 pr-0.5 font-semibold text-ink hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-100"
          >
            {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
          <select
            value={cursorYear}
            onChange={(e) => setCursor(`${Number(e.target.value)}-${String(cursorMonth + 1).padStart(2, '0')}-01`)}
            aria-label={`${label} year`}
            className="rounded-lg bg-transparent py-1 pl-1.5 pr-0.5 font-semibold tabular-nums text-ink hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-100"
          >
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="flex items-center">
          <button type="button" className={navBtn} onClick={() => setCursor(addMonths(cursor, 1))} disabled={max ? cursor.slice(0, 7) >= max.slice(0, 7) : false} title="Next month" aria-label={`Next month, ${label}`}><ChevronRight className="h-4 w-4" /></button>
          <button type="button" className={navBtn} onClick={() => setCursor(addYears(cursor, 1))} title="Next year" aria-label={`Next year, ${label}`}><ChevronsRight className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-500">
        {weekdays.map((d) => <span key={d}>{d}</span>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((iso, i) => {
          if (!iso) return <span key={`e-${i}`} />;
          const before = iso < min;
          const after = max ? iso > max : false;
          const taken = !!isDisabled?.(iso);
          const blocked = before || after || taken;
          const selected = iso === value;
          const inRange = !selected && between(iso);
          return (
            <button
              key={iso}
              type="button"
              disabled={blocked}
              onClick={() => onChange(iso)}
              aria-pressed={selected}
              aria-label={formatDate(iso, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              title={taken ? 'Already booked' : undefined}
              className={cn(
                'grid h-9 place-items-center rounded-lg text-sm tabular-nums transition',
                selected && 'bg-brand-600 font-semibold text-white',
                inRange && 'bg-brand-50 text-brand-700',
                !selected && !inRange && !blocked && 'hover:bg-brand-50',
                taken && !selected && 'bg-slate-100 text-slate-400 line-through',
                (before || after) && !taken && 'text-slate-300',
                blocked && 'cursor-not-allowed',
              )}
            >
              {Number(iso.slice(8))}
            </button>
          );
        })}
      </div>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : hint ? <p className="mt-2 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}
