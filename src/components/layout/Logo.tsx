import { Link } from 'react-router-dom';
import { cn } from '@/utils/cn';

/** `compact` shows only the mark (used by the collapsed dashboard sidebar). `small` shrinks it for tight spaces. */
export function Logo({ light = false, compact = false, small = false }: { light?: boolean; compact?: boolean; small?: boolean }) {
  const size = small ? 40 : 48;
  return (
    <Link to="/explore" className={`flex items-center ${small ? 'gap-2' : 'gap-2.5'} rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600`} aria-label="Tourista Rwanda home">
      <img
        src="/logo.jpeg"
        alt="Tourista Rwanda"
        width={size}
        height={size}
        className={cn('shrink-0 rounded-lg object-contain', small ? 'h-10 w-10' : 'h-12 w-12')}
      />
      {!compact && (
        <span className={`whitespace-nowrap font-display font-extrabold tracking-tight ${small ? 'text-lg' : 'text-xl sm:text-2xl'} ${light ? 'text-white' : 'text-brand-600'}`}>
          Tourista Rwanda
        </span>
      )}
    </Link>
  );
}
