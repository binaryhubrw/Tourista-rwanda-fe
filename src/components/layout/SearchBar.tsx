import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Store, X } from 'lucide-react';
import { search, type SearchScope } from '@/services/searchService';
import { useDebounce } from '@/hooks/useDebounce';
import { DatePicker } from '@/components/ui';
import { todayIso } from '@/utils/format';
import { addDaysIso } from '@/utils/pricing';
import { EXPLORE_SCOPES, normalizeExploreScope, normalizeExploreService, writeExploreDates } from '@/utils/explore';
import { useOfferedServices } from '@/hooks/useOfferedServices';
import { cn } from '@/utils/cn';
import type { SearchResult } from '@/types';

const SVC = 'svc:';
const typeOptions = [
  { value: 'all', label: 'All listings' },
  ...EXPLORE_SCOPES.map((item) => ({ value: item.id, label: item.label })),
];

function wantedFrom(scope: string, service: string) {
  const extra = normalizeExploreService(service);
  if (extra) return `${SVC}${extra}`;
  return normalizeExploreScope(scope) || 'all';
}

function searchScopeOf(wanted: string): SearchScope {
  if (wanted === 'hotels') return 'accommodations';
  if (wanted === 'food') return 'restaurants';
  if (wanted === 'all') return 'all';
  return 'businesses';
}

interface Props {
  variant?: 'hero' | 'compact';
  placeholder?: string;
  autoFocus?: boolean;
  onNavigate?: () => void;
  initialQuery?: string;
  initialStart?: string;
  initialEnd?: string;
  initialScope?: string;
  initialService?: string;
}

/** Search box with live suggestions. Enter or the button opens the full results page. */
export function SearchBar({
  variant = 'compact',
  placeholder = 'What do you want to book in Rwanda?',
  autoFocus,
  onNavigate,
  initialQuery = '',
  initialStart = '',
  initialEnd = '',
  initialScope = '',
  initialService = '',
}: Props) {
  const navigate = useNavigate();
  const { options: serviceOptions } = useOfferedServices();
  const [query, setQuery] = useState(initialQuery);
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [wanted, setWanted] = useState(() => wantedFrom(initialScope, initialService));
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const debounced = useDebounce(query, 150);
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const hero = variant === 'hero';

  useEffect(() => {
    const q = debounced.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    search(q, searchScopeOf(wanted))
      .then((rows) => { if (!cancelled) setSuggestions(rows.slice(0, 6)); })
      .catch(() => { if (!cancelled) setSuggestions([]); });
    return () => { cancelled = true; };
  }, [debounced, wanted]);

  useEffect(() => {
    const close = (e: MouseEvent) => !wrapRef.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => setActive(-1), [suggestions]);

  const withDates = (href: string) => {
    if (!start && !end) return href;
    const [pathAndQuery, hash] = href.split('#');
    const [pathname, qs] = pathAndQuery.split('?');
    const next = writeExploreDates(new URLSearchParams(qs), start, end);
    const queryString = next.toString();
    return `${pathname}${queryString ? `?${queryString}` : ''}${hash ? `#${hash}` : ''}`;
  };

  const go = (href: string) => {
    setOpen(false);
    onNavigate?.();
    navigate(withDates(href));
  };

  const exploreHref = (q: string) => {
    const next = new URLSearchParams();
    if (q) next.set('q', q);
    if (wanted.startsWith(SVC)) {
      next.set('scope', 'services');
      next.set('service', wanted.slice(SVC.length));
    } else if (wanted !== 'all') {
      next.set('scope', wanted);
    }
    writeExploreDates(next, start, end);
    const queryString = next.toString();
    return queryString ? `/explore?${queryString}#explore-listings` : '/explore#explore-listings';
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    go(exploreHref(query.trim()));
  };

  const onStart = (iso: string) => {
    setOpen(false);
    setStart(iso);
    if (iso && (!end || end <= iso)) setEnd(addDaysIso(iso, 1));
  };

  const selectedService = wanted.startsWith(SVC) ? wanted.slice(SVC.length) : '';
  const listedServices = selectedService && !serviceOptions.some((item) => item.id === selectedService)
    ? [{ id: selectedService, label: selectedService }, ...serviceOptions]
    : serviceOptions;
  const filtersSet = Boolean(start || end || wanted !== 'all');
  const clearFilters = () => {
    setOpen(false);
    setStart('');
    setEnd('');
    setWanted('all');
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!suggestions.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => (a + 1) % suggestions.length); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => (a <= 0 ? suggestions.length - 1 : a - 1)); }
    if (e.key === 'Escape') setOpen(false);
    if (e.key === 'Enter' && active >= 0 && suggestions[active]) {
      e.preventDefault();
      go(suggestions[active].href);
    }
  };

  return (
    <div ref={wrapRef} className="relative w-full">
      <form
        role="search"
        onSubmit={submit}
        className={cn(
          'flex w-full items-stretch bg-white',
          hero
            ? 'flex-col gap-2 rounded-[1.75rem] border border-slate-100 p-2 shadow-lift md:flex-row md:items-center md:gap-0 md:rounded-full md:p-1.5'
            : 'rounded-full border border-slate-300 focus-within:border-brand-600',
        )}
      >
        <label className={cn(hero ? 'flex min-w-0 flex-1 items-center gap-3 rounded-full px-4 py-1 hover:bg-slate-50 md:min-w-[16rem]' : 'flex flex-1 items-center gap-2 pl-3.5')}>
          <Search className={cn('shrink-0 text-brand-600', hero ? 'h-5 w-5' : 'h-4 w-4')} aria-hidden />
          <span className="flex min-w-0 flex-1 flex-col">
            {hero && <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Search</span>}
            {!hero && <span className="sr-only">Search Tourista Rwanda</span>}
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
              className={cn('w-full bg-transparent text-ink placeholder:text-slate-400 focus:outline-none', hero ? 'h-7 text-[15px] font-medium' : 'h-10 text-sm')}
            />
          </span>
          {query && (
            <button type="button" onClick={() => setQuery('')} className="rounded-full p-1 text-slate-400 hover:bg-white hover:text-ink" aria-label="Clear search">
              <X className="h-4 w-4" />
            </button>
          )}
        </label>
        {hero && (
          <>
            <span className="hidden h-10 w-px shrink-0 bg-slate-200 md:block" aria-hidden />
            <div className="rounded-full px-1 hover:bg-slate-50">
              <DatePicker compact embedded label="From" placeholder="Add date" min={todayIso()} value={start} onChange={onStart} />
            </div>
            <span className="hidden h-10 w-px shrink-0 bg-slate-200 md:block" aria-hidden />
            <div className="rounded-full px-1 hover:bg-slate-50">
              <DatePicker compact embedded label="To" placeholder="Add date" min={start || todayIso()} value={end} onChange={(iso) => { setOpen(false); setEnd(iso); }} />
            </div>
            <span className="hidden h-10 w-px shrink-0 bg-slate-200 md:block" aria-hidden />
            <label className="flex w-full min-w-0 shrink-0 flex-col rounded-full px-4 py-1 hover:bg-slate-50 md:w-[12rem]">
              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">What</span>
              <select
                id={`${listId}-scope`}
                value={wanted}
                onChange={(e) => setWanted(e.target.value)}
                className="h-7 w-full truncate bg-transparent text-[15px] font-medium text-ink focus:outline-none"
              >
                <optgroup label="Browse">
                  {typeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </optgroup>
                {listedServices.length > 0 && (
                  <optgroup label="Services">
                    {listedServices.map((item) => (
                      <option key={item.id} value={`${SVC}${item.id}`}>{item.label}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </label>
            {filtersSet && (
              <button
                type="button"
                onClick={clearFilters}
                className="mx-1 grid h-10 w-10 shrink-0 place-items-center self-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-ink"
                aria-label="Clear dates and listing type"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <button type="submit" className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-brand-600 px-6 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 md:h-14 md:px-8 md:text-base">
              <Search className="h-4 w-4 md:h-5 md:w-5" aria-hidden />
              Search
            </button>
          </>
        )}
        {!hero && (
          <button type="submit" className="m-1 h-8 shrink-0 rounded-full bg-brand-600 px-3 text-sm font-semibold text-white hover:bg-brand-700">
            Search
          </button>
        )}
      </form>

      {open && suggestions.length > 0 && (
        <ul id={listId} role="listbox" className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-lift">
          {suggestions.map((s, i) => {
            const Icon = Store;
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
            <button type="button" onClick={() => go(exploreHref(query.trim()))} className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-brand-600 hover:bg-brand-50">
              See all available for these dates
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
