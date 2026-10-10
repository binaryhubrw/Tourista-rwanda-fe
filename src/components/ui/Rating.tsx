import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/utils/cn';

export function Rating({ value, count, size = 'sm', className }: { value: number; count?: number; size?: 'sm' | 'md'; className?: string }) {
  const s = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)} aria-label={`Rated ${value.toFixed(1)} out of 5${count ? ` from ${count} reviews` : ''}`}>
      <Star className={cn(s, 'fill-brand-600 text-brand-600')} aria-hidden />
      <span className="font-semibold text-ink">{value > 0 ? value.toFixed(1) : 'New'}</span>
      {count !== undefined && count > 0 && <span className="text-slate-500">({count.toLocaleString()})</span>}
    </span>
  );
}

export function StarRow({ value }: { value: number }) {
  return (
    <span className="inline-flex" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={cn('h-4 w-4', i <= value ? 'fill-brand-600 text-brand-600' : 'text-slate-300')} aria-hidden />
      ))}
    </span>
  );
}

export function RatingInput({ value, onChange, error }: { value: number; onChange: (v: number) => void; error?: string }) {
  const [hover, setHover] = useState(0);
  const labels = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];
  const shown = hover || value;
  return (
    <fieldset>
      <legend className="mb-1.5 block text-sm font-semibold text-ink">Your rating <span className="text-brand-600" aria-hidden>*</span></legend>
      <div className="flex items-center gap-3">
        <div className="flex" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((i) => (
            <label key={i} className="cursor-pointer p-0.5" onMouseEnter={() => setHover(i)}>
              <input type="radio" name="rating" value={i} checked={value === i} onChange={() => onChange(i)} className="peer sr-only" />
              <Star className={cn('h-8 w-8 transition-colors peer-focus-visible:rounded peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-brand-600', i <= shown ? 'fill-brand-600 text-brand-600' : 'text-slate-300')} aria-hidden />
              <span className="sr-only">{i} star{i > 1 ? 's' : ''}</span>
            </label>
          ))}
        </div>
        <span className="text-sm font-medium text-slate-600">{labels[shown]}</span>
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </fieldset>
  );
}
