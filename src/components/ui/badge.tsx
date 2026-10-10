import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

type Tone = 'brand' | 'solid' | 'neutral' | 'success' | 'warning' | 'danger' | 'glass';
const tones: Record<Tone, string> = {
  brand: 'bg-brand-50 text-brand-600',
  solid: 'bg-brand-600 text-white',
  neutral: 'bg-slate-100 text-slate-700',
  success: 'bg-brand-600 text-white',
  warning: 'bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-200',
  danger: 'bg-slate-100 text-slate-600',
  glass: 'bg-white/90 text-brand-600 backdrop-blur',
};

export function Badge({ children, tone = 'brand', icon, className }: { children: ReactNode; tone?: Tone; icon?: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold', tones[tone], className)}>
      {icon}
      {children}
    </span>
  );
}
