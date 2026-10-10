import { cn } from '@/utils/cn';

interface Props<T extends string> {
  value: T;
  options: { value: T; label: string; count?: number }[];
  onChange: (value: T) => void;
  label: string;
}

/** Segmented filter (e.g. booking status) with optional counts. */
export function FilterTabs<T extends string>({ value, options, onChange, label }: Props<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="flex max-w-full gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn('inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors', active ? 'bg-white text-ink shadow-sm' : 'text-slate-600 hover:text-ink')}
          >
            {o.label}
            {o.count !== undefined && <span className={cn('rounded-md px-1.5 text-xs tabular-nums', active ? 'bg-brand-50 text-brand-600' : 'bg-slate-200/70 text-slate-600')}>{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
