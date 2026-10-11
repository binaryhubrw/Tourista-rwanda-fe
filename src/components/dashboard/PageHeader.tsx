import type { ReactNode } from 'react';

/** Title row at the top of each dashboard page. */
export function PageHeader({ highlight, title, intro, action }: { highlight?: string; title: string; intro?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {highlight && (
          <p className="mb-2">
            <span className="inline-flex max-w-full items-center truncate rounded-full bg-brand-600 px-3.5 py-1 text-sm font-bold text-white shadow-sm ring-2 ring-brand-600/25 sm:text-base">
              {highlight}
            </span>
          </p>
        )}
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">{title}</h1>
        {intro && <p className="mt-1 text-slate-600">{intro}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap gap-2">{action}</div>}
    </div>
  );
}

/** Heading for a block inside a dashboard page. */
export function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
      {action}
    </div>
  );
}
