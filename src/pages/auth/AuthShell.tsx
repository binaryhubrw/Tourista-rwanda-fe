import type { ReactNode } from 'react';
import { Logo } from '@/components/layout/Logo';
import { HillLines, SmartImage } from '@/components/ui';
import { images } from '@/data/images';
import { cn } from '@/utils/cn';

export function AuthShell({ title, intro, children, fit = false }: { title: string; intro: string; children: ReactNode; fit?: boolean }) {
  return (
    <div className={cn('grid lg:grid-cols-2', fit ? 'h-full' : 'min-h-[calc(100vh-72px)]')}>
      <div className="relative hidden overflow-hidden bg-brand-600 lg:block">
        <SmartImage src={images.volcanoes} alt="Virunga volcanoes above the clouds" quiet className="absolute inset-0 h-full w-full opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-600/95 to-brand-600/35" aria-hidden />
        <HillLines className="absolute inset-x-0 bottom-0 h-1/2 w-full text-white/20" />
        <div className="relative flex h-full flex-col justify-end p-12 text-white">
          <Logo light />
          <p className="mt-6 max-w-md font-display text-3xl font-bold leading-tight">Every visit can support a guide, a weaver, a farmer or a ranger.</p>
        </div>
      </div>
      <div className={cn('flex items-center justify-center px-4 sm:px-8', fit ? 'h-full overflow-hidden py-2 sm:py-4' : 'py-10')}>
        <div className="w-full max-w-md">
          <h1 className={cn('font-display font-bold text-ink', fit ? 'text-xl sm:text-2xl' : 'text-3xl')}>{title}</h1>
          <p className={cn('text-slate-600', fit ? 'mt-0.5 text-sm sm:mt-1' : 'mt-2')}>{intro}</p>
          <div className={fit ? 'mt-3 sm:mt-4' : 'mt-8'}>{children}</div>
        </div>
      </div>
    </div>
  );
}
