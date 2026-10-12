import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8', className)}>{children}</div>;
}

export function SectionHeader({ title, intro, action, className }: { title: string; intro?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="max-w-2xl">
        <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-4xl">{title}</h2>
        {intro && <p className="mt-2 text-lg text-slate-600">{intro}</p>}
      </div>
      {action}
    </div>
  );
}

/** Page banner with the contour-line "thousand hills" motif. */
export function PageHeader({ title, intro, children }: { title: string; intro?: string; children?: ReactNode }) {
  return (
    <header className="relative overflow-hidden bg-brand-600 text-white">
      <HillLines className="absolute inset-x-0 bottom-0 h-full w-full text-white/15" />
      <Container className="relative py-10 sm:py-16">
        <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-5xl">{title}</h1>
        {intro && <p className="mt-3 max-w-2xl text-base text-white sm:text-lg">{intro}</p>}
        {children && <div className="mt-6">{children}</div>}
      </Container>
    </header>
  );
}

/** Layered contour lines evoking Rwanda's "land of a thousand hills". */
export function HillLines({ className, lines = 9 }: { className?: string; lines?: number }) {
  return (
    <svg className={className} viewBox="0 0 1440 320" preserveAspectRatio="none" aria-hidden fill="none">
      {Array.from({ length: lines }).map((_, i) => {
        const y = 120 + i * 24;
        return (
          <path
            key={i}
            d={`M0 ${y} C 120 ${y - 60 + (i % 3) * 10}, 240 ${y + 20}, 360 ${y - 30} S 600 ${y - 80 + i * 4}, 760 ${y - 20} S 1020 ${y + 30}, 1140 ${y - 50} S 1340 ${y - 10}, 1440 ${y - 40}`}
            stroke="currentColor"
            strokeWidth={1.4}
          />
        );
      })}
    </svg>
  );
}
