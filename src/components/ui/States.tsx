import type { ReactNode } from 'react';
import { Loader2, Compass, AlertCircle, RotateCw } from 'lucide-react';
import { Button } from './Button';
import { cn } from '@/utils/cn';

export function LoadingSpinner({ label = 'Loading', className }: { label?: string; className?: string }) {
  return (
    <div role="status" className={cn('flex items-center justify-center gap-3 py-16 text-brand-600', className)}>
      <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
      <span className="text-sm font-medium">{label}…</span>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-xl bg-slate-200/70', className)} aria-hidden />;
}

export function CardSkeletonGrid({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div role="status" aria-label="Loading" className={cn('grid gap-6 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
          <Skeleton className="aspect-[4/3] rounded-none" />
          <div className="space-y-3 p-5">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface EmptyProps { title: string; message?: string; action?: ReactNode; icon?: ReactNode }

export function EmptyState({ title, message, action, icon }: EmptyProps) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-brand-200 bg-brand-50/40 px-6 py-14 text-center">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-white text-brand-600 shadow-sm">{icon ?? <Compass className="h-7 w-7" aria-hidden />}</div>
      <h3 className="font-display text-lg font-bold text-ink">{title}</h3>
      {message && <p className="mt-1 max-w-md text-slate-600">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message = 'Something went wrong. Please try again.', onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-3xl border border-red-100 bg-red-50/50 px-6 py-12 text-center">
      <AlertCircle className="mb-3 h-9 w-9 text-red-600" aria-hidden />
      <p className="max-w-md font-medium text-ink">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          <RotateCw className="h-4 w-4" aria-hidden /> Try again
        </Button>
      )}
    </div>
  );
}
