import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Sparkles, Store, X } from 'lucide-react';
import { searchSync, type SearchScope } from '@/services/searchService';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/utils/cn';

export const scopeOptions: { value: SearchScope; label: string }[] = [
  { value: 'all', label: 'Everything' },
  { value: 'destinations', label: 'Destinations' },
  { value: 'experiences', label: 'Experiences' },
  { value: 'accommodations', label: 'Accommodations' },
  { value: 'restaurants', label: 'Restaurants' },
  { value: 'businesses', label: 'Local businesses' },
];

const typeIcon = { location: MapPin, experience: Sparkles, business: Store };

interface Props {
  variant?: 'hero' | 'compact';
  placeholder?: string;
  autoFocus?: boolean;
  onNavigate?: () => void;
  initialQuery?: string;
}

/** Search box with live suggestions. Enter or the button opens the full results page. */
export function SearchBar({ variant = 'compact', placeholder = 'Where do you want to go in Rwanda?', autoFocus, onNavigate, initialQuery = '' }: Props) {
  const navigate = useNavigate();
  const [query, setQuery] = useState(initialQuery);
  const [scope, setScope] = useState<SearchScope>('all');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const debounced = useDebounce(query, 150);

  const suggestions = useMemo(() => (debounced.trim().length >= 2 ? searchSync(debounced, scope, 6) : []), [debounced, scope]);

  useEffect(() => {
    const close = (e: MouseEvent) => !wrapRef.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => setActive(-1), [suggestions]);

  const go = (href: string) => {
    setOpen(false);
    onNavigate?.();
    navigate(href);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (active >= 0 && suggestions[active]) return go(suggestions[active].href);
    const q = query.trim();
    go(q ? `/search?q=${encodeURIComponent(q)}&scope=${scope}` : '/explore');
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!suggestions.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => (a + 1) % suggestions.length); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => (a <= 0 ? suggestions.length - 1 : a - 1)); }
    if (e.key === 'Escape') setOpen(false);
  };

  const hero = variant === 'hero';

  return (
    <div ref={wrapRef} className="relative w-full">
      <form role="search" onSubmit={submit} className={cn('flex w-full items-stretch bg-white', hero ? 'flex-col gap-2 rounded-3xl p-2 shadow-lift sm:flex-row sm:rounded-full' : 'rounded-full border border-slate-300 focus-within:border-brand-600')}>
        <label className={cn('flex flex-1 items-center gap-2', hero ? 'px-4' : 'pl-3.5')}>
          <Search className={cn('shrink-0 text-brand-600', hero ? 'h-5 w-5' : 'h-4 w-4')} aria-hidden />
          <span className="sr-only">Search Tourista Rwanda</span>
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            autoFocus={autoFocus}
            placeholder={placeholder}
            role="combobox"
            aria-expanded={open && suggestions.length > 0}
            aria-controls={listId}
            aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
            aria-autocomplete="list"
            className={cn('w-full bg-transparent text-ink placeholder:text-slate-400 focus:outline-none', hero ? 'h-12 text-base sm:text-lg' : 'h-10 text-sm')}
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} className="rounded-full p-1 text-slate-400 hover:text-ink" aria-label="Clear search">
              <X className="h-4 w-4" />
            </button>
          )}
        </label>
        {hero && (
          <>
            <label className="sr-only" htmlFor={`${listId}-scope`}>Search in</label>
            <select
              id={`${listId}-scope`}
              value={scope}
              onChange={(e) => setScope(e.target.value as SearchScope)}
              className="h-12 rounded-full border border-slate-200 bg-brand-50 px-4 text-sm font-semibold text-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-200 sm:border-0"
            >
              {scopeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </>
        )}
        <button type="submit" className={cn('shrink-0 rounded-full bg-brand-600 font-semibold text-white hover:bg-brand-700', hero ? 'h-12 px-7' : 'm-1 h-8 px-3 text-sm')}>
          Search
        </button>
      </form>

      {open && suggestions.length > 0 && (
        <ul id={listId} role="listbox" className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-lift">
          {suggestions.map((s, i) => {
            const Icon = typeIcon[s.type];
            return (
              <li key={`${s.type}-${s.id}`} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(s.href)}
                  className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left', i === active ? 'bg-brand-50' : 'hover:bg-brand-50')}
                >
                  <Icon className="h-4 w-4 shrink-0 text-brand-600" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-ink">{s.title}</span>
                    <span className="block truncate text-sm text-slate-500">{s.subtitle}</span>
                  </span>
                </button>
              </li>
            );
          })}
          <li>
            <button type="button" onClick={() => go(`/search?q=${encodeURIComponent(query.trim())}&scope=${scope}`)} className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-brand-600 hover:bg-brand-50">
              See all results for “{query.trim()}”
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
