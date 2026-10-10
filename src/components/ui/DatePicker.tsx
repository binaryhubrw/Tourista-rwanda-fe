import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';
import { addDaysIso, nightsBetween } from '@/utils/pricing';
import { formatDate, todayIso } from '@/utils/format';

const weekdays = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function monthStart(iso: string) {
  return `${iso.slice(0, 7)}-01`;
}

function addMonths(iso: string, delta: number) {
  const d = new Date(`${iso}T00:00:00`);
  d.setMonth(d.getMonth() + delta);
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
  error?: string;
  hint?: string;
  required?: boolean;
}

export function DatePicker({ label, value, onChange, min = todayIso(), max, isDisabled, error, hint, required }: Props) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() => monthStart(value || min || todayIso()));
  const cells = useMemo(() => daysInMonth(cursor), [cursor]);
  const monthLabel = new Date(`${cursor}T00:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const pick = (iso: string) => {
    onChange(iso);
    setOpen(false);
  };

  return (
    <div ref={root} className="relative">
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">
        {label} {required && <span className="text-brand-600" aria-hidden>*</span>}
      </label>
      <button
        id={id}
        type="button"
        onClick={() => { setCursor(monthStart(value || min || todayIso())); setOpen((o) => !o); }}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cn('h-[46px] w-full rounded-xl border bg-white px-3.5 text-left text-[15px] focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100', error ? 'border-red-400' : 'border-slate-300', value ? 'text-ink' : 'text-slate-400')}
      >
        {value ? formatDate(value) : 'Choose a date'}
      </button>
      {open && (
        <div role="dialog" aria-label={label} className="absolute z-30 mt-2 w-[min(100%,20rem)] rounded-2xl border border-slate-200 bg-white p-3 shadow-lg">
          <div className="mb-3 flex items-center justify-between">
            <button type="button" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-slate-100" onClick={() => setCursor(addMonths(cursor, -1))} aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></button>
            <p className="font-semibold text-ink">{monthLabel}</p>
            <button type="button" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-slate-100" onClick={() => setCursor(addMonths(cursor, 1))} aria-label="Next month"><ChevronRight className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-500">
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
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={blocked}
                  onClick={() => pick(iso)}
                  aria-pressed={selected}
                  title={taken ? 'Already booked' : undefined}
                  className={cn(
                    'grid h-9 place-items-center rounded-lg text-sm tabular-nums',
                    selected && 'bg-brand-600 font-semibold text-white',
                    !selected && !blocked && 'hover:bg-brand-50',
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
          <p className="mt-2 text-xs text-slate-500">Struck-through days are already booked.</p>
        </div>
      )}
      {error ? <p className="mt-1.5 text-sm text-red-600">{error}</p> : hint ? <p className="mt-1.5 text-sm text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function spanLabel(start: string, end: string) {
  const nights = nightsBetween(start, end);
  const from = formatDate(start, { day: 'numeric', month: 'short' });
  const to = formatDate(end, { day: 'numeric', month: 'short' });
  return nights > 0 ? `${from} → ${to}` : from;
}
