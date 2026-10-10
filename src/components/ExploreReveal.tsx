/** Landing-only catalogue reveal — listing-shaped cards, not the dashboard spinner. */
export function ExploreReveal({ count = 6, compact = false }: { count?: number; compact?: boolean }) {
  return (
    <div role="status" aria-live="polite" aria-label="Finding listings" className={compact ? undefined : 'landing-reveal'}>
      {!compact && (
        <p className="mb-5 font-display text-lg font-semibold tracking-tight text-ink">
          Discovering stays, tables and guides
          <span className="landing-reveal-line mt-2 block h-0.5 w-36 origin-left rounded-full bg-brand-600" />
        </p>
      )}
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="landing-card overflow-hidden rounded-2xl border border-slate-200 bg-white" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="landing-card-photo relative aspect-[16/10] overflow-hidden">
              <span className="landing-card-shine" />
            </div>
            <div className="space-y-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <span className="landing-bar h-5 w-2/3 rounded-md" />
                <span className="landing-bar h-4 w-12 rounded-md" />
              </div>
              <span className="landing-bar h-3.5 w-1/3 rounded-md" />
              <span className="landing-bar h-3.5 w-full rounded-md" />
              <span className="landing-bar h-3.5 w-5/6 rounded-md" />
              <div className="flex gap-2 pt-2">
                <span className="landing-bar h-9 w-24 rounded-full" />
                <span className="landing-bar h-9 w-16 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
