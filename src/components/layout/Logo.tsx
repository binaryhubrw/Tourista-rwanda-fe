import { Link } from 'react-router-dom';

/** `compact` shows only the mark (used by the collapsed dashboard sidebar). */
export function Logo({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600" aria-label="Tourista Rwanda home">
      <svg width="34" height="34" className="shrink-0" viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" rx="9" fill={light ? '#ffffff' : '#00628B'} />
        <path d="M3 24c4-7 7-10 10-10s5 4 8 4 5-4 8-6v12H3z" fill={light ? '#00628B' : '#ffffff'} />
        <circle cx="22" cy="9" r="3" fill={light ? '#00628B' : '#ffffff'} />
      </svg>
      {!compact && (
        <span className={`whitespace-nowrap font-display text-lg font-extrabold tracking-tight sm:text-xl ${light ? 'text-white' : 'text-brand-600'}`}>
          Tourista Rwanda
        </span>
      )}
    </Link>
  );
}
