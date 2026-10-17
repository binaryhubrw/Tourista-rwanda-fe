import { Link } from 'react-router-dom';

/** `compact` shows only the mark (used by the collapsed dashboard sidebar). */
export function Logo({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  return (
    <Link to="/explore" className="flex items-center gap-2.5 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600" aria-label="Tourista Rwanda home">
      <img
        src="/logo.jpeg"
        alt="Tourista Rwanda"
        width={48}
        height={48}
        className="h-12 w-12 shrink-0 rounded-lg object-contain"
      />
      {!compact && (
        <span className={`whitespace-nowrap font-display text-xl font-extrabold tracking-tight sm:text-2xl ${light ? 'text-white' : 'text-brand-600'}`}>
          Tourista Rwanda
        </span>
      )}
    </Link>
  );
}
