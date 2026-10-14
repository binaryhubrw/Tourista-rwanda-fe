import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

type Tone = 'brand' | 'solid' | 'neutral' | 'success' | 'warning' | 'danger' | 'violet' | 'glass';
const tones: Record<Tone, string> = {
  brand: 'bg-brand-50 text-brand-700',
  solid: 'bg-brand-600 text-white',
  neutral: 'bg-slate-100 text-slate-600',
  success: 'bg-emerald-50 text-emerald-800',
  warning: 'bg-amber-50 text-amber-800',
  danger: 'bg-red-50 text-red-700',
  violet: 'bg-violet-50 text-violet-800',
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
