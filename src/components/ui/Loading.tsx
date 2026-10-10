import { cn } from '@/utils/cn';

const markSize = { sm: 'h-4 w-4', md: 'h-11 w-11', lg: 'h-14 w-14' } as const;

/** Brand mark used on pages, tables, overlays and buttons while data is in flight. */
export function LoadingMark({
  size = 'md',
  tone = 'brand',
  className,
}: {
  size?: keyof typeof markSize;
  tone?: 'brand' | 'current';
  className?: string;
}) {
  const light = tone === 'current';
  if (size === 'sm') {
    return (
      <span className={cn('relative inline-block h-4 w-4 shrink-0', className)} aria-hidden>
        <span className={cn('absolute inset-0 rounded-full border-2 animate-load-spin', light ? 'border-white/30 border-t-white' : 'border-brand-200 border-t-brand-600')} />
      </span>
    );
  }
  return (
    <span className={cn('relative inline-grid place-items-center', markSize[size], className)} aria-hidden>
      <span className={cn('absolute inset-0 rounded-full', light ? 'bg-white/15' : 'bg-brand-50')} />
      <span className={cn('absolute inset-0 rounded-full border-2', light ? 'border-white/25' : 'border-brand-100')} />
      <span className={cn('absolute inset-[3px] rounded-full border-2 border-transparent animate-load-spin', light ? 'border-t-white border-r-white/70' : 'border-t-brand-600 border-r-brand-400')} />
      <span className={cn('absolute inset-[28%] rounded-full animate-load-pulse', light ? 'bg-white' : 'bg-brand-600')} />
    </span>
  );
}

type LoadingVariant = 'page' | 'section' | 'inline';

export function Loading({
  label = 'Loading',
  variant = 'page',
  className,
}: {
  label?: string;
  variant?: LoadingVariant;
  className?: string;
}) {
  const inline = variant === 'inline';
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        'flex items-center justify-center text-ink',
        inline ? 'flex-row gap-2.5 py-2' : 'flex-col gap-4 text-center',
        variant === 'page' && 'min-h-[50vh] py-16',
        variant === 'section' && 'min-h-[14rem] py-10',
        className,
      )}
    >
      <LoadingMark size={inline ? 'sm' : variant === 'page' ? 'lg' : 'md'} />
      <p className={cn(inline ? 'text-sm font-medium text-slate-600' : 'font-display text-base font-semibold tracking-tight')}>{label}</p>
    </div>
  );
}

/** Covers a form or panel while a request is being sent. Parent must be `relative`. */
export function LoadingOverlay({ show, label = 'Saving' }: { show: boolean; label?: string }) {
  if (!show) return null;
  return (
    <div className="absolute inset-0 z-20 grid place-items-center rounded-[inherit] bg-white/75 backdrop-blur-[2px]" role="status" aria-live="assertive" aria-busy="true">
      <Loading variant="section" label={label} className="min-h-0 py-6" />
    </div>
  );
}
