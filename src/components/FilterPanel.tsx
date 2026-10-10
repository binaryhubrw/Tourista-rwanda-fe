import type { ReactNode } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface FilterGroup {
  id: string;
  label: string;
  type: 'checkbox' | 'radio';
  options: { value: string; label: string }[];
}

export type FilterValues = Record<string, string[]>;

interface Props {
  groups: FilterGroup[];
  values: FilterValues;
  onChange: (values: FilterValues) => void;
  open: boolean;
  onClose: () => void;
  resultCount: number;
  extra?: ReactNode;
}

/** Sidebar on desktop, bottom sheet on mobile. */
export function FilterPanel({ groups, values, onChange, open, onClose, resultCount, extra }: Props) {
  const toggle = (g: FilterGroup, value: string) => {
    const cur = values[g.id] ?? [];
    const next = g.type === 'radio' ? (cur[0] === value ? [] : [value]) : cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
    onChange({ ...values, [g.id]: next });
  };
  const activeCount = Object.values(values).reduce((s, v) => s + v.length, 0);

  const body = (
    <div className="space-y-6">
      {extra}
      {groups.map((g) => (
        <fieldset key={g.id}>
          <legend className="mb-2 font-display text-[15px] font-bold text-ink">{g.label}</legend>
          <div className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
            {g.options.map((o) => {
              const checked = (values[g.id] ?? []).includes(o.value);
              return (
                <label key={o.value} className={cn('flex cursor-pointer items-center gap-2.5 rounded-full border px-3 py-1.5 text-sm lg:rounded-lg lg:border-0 lg:px-2', checked ? 'border-brand-600 bg-brand-50 font-semibold text-brand-600' : 'border-slate-200 text-slate-700 hover:bg-slate-50')}>
                  <input
                    type={g.type}
                    name={g.id}
                    checked={checked}
                    onChange={() => toggle(g, o.value)}
                    onClick={() => g.type === 'radio' && checked && toggle(g, o.value)}
                    className="h-4 w-4 accent-brand-600 max-lg:sr-only"
                  />
                  {o.label}
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block" aria-label="Filters">
        <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold"><SlidersHorizontal className="h-5 w-5 text-brand-600" aria-hidden />Filters</h2>
            {activeCount > 0 && <button onClick={() => onChange({})} className="text-sm font-semibold text-brand-600 hover:underline">Clear all</button>}
          </div>
          {body}
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <div className="absolute inset-0 bg-brand-900/50" onClick={onClose} aria-hidden />
          <div role="dialog" aria-modal="true" aria-label="Filters" className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-3xl bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="font-display text-lg font-bold">Filters</h2>
              <button onClick={onClose} className="rounded-full p-1.5 hover:bg-slate-100" aria-label="Close filters"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5">{body}</div>
            <div className="flex gap-2 border-t border-slate-100 p-4">
              <button onClick={() => onChange({})} className="h-11 flex-1 rounded-full border border-slate-300 font-semibold">Clear</button>
              <button onClick={onClose} className="h-11 flex-[2] rounded-full bg-brand-600 font-semibold text-white">{resultCount < 0 ? 'Show results' : `Show ${resultCount} result${resultCount === 1 ? '' : 's'}`}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function FilterButton({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex h-11 items-center gap-2 rounded-full border border-slate-300 bg-white px-4 font-semibold text-ink lg:hidden">
      <SlidersHorizontal className="h-4 w-4 text-brand-600" aria-hidden />Filters
      {count > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1.5 text-xs text-white">{count}</span>}
    </button>
  );
}
