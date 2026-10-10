import { useState, type ImgHTMLAttributes } from 'react';
import { Mountain } from 'lucide-react';
import { cn } from '@/utils/cn';

interface Props extends ImgHTMLAttributes<HTMLImageElement> {
  /** Decorative background: fall back to plain brand colour with no icon or label. */
  quiet?: boolean;
}

/** Image with a branded fallback so a missing photo never shows a broken icon. */
export function SmartImage({ src, alt, className, quiet, ...rest }: Props) {
  const [failed, setFailed] = useState(false);
  if (failed || !src) {
    const positioned = /\b(absolute|fixed)\b/.test(className ?? '');
    return (
      <div role="img" aria-label={alt} className={cn('grid place-items-center overflow-hidden bg-brand-600 text-white', !positioned && 'relative', className)}>
        {!quiet && (
          <>
            <svg className="absolute inset-0 h-full w-full opacity-30" viewBox="0 0 400 300" preserveAspectRatio="none" aria-hidden>
              {[0, 1, 2, 3, 4].map((i) => (
                <path key={i} d={`M0 ${190 + i * 22} C 80 ${150 + i * 22}, 140 ${210 + i * 22}, 220 ${170 + i * 22} S 360 ${140 + i * 22}, 400 ${180 + i * 22}`} fill="none" stroke="white" strokeWidth="1.5" />
              ))}
            </svg>
            <div className="relative flex flex-col items-center gap-1 px-4 text-center">
              <Mountain className="h-8 w-8 opacity-80" aria-hidden />
              <span className="font-display text-sm font-semibold opacity-90">{alt}</span>
            </div>
          </>
        )}
      </div>
    );
  }
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className={cn('object-cover', className)} {...rest} />;
}
