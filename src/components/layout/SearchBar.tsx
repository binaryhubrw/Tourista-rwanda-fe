import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Search, Store, X } from 'lucide-react';
import { search, type SearchScope } from '@/services/searchService';
import { useDebounce } from '@/hooks/useDebounce';
import { DatePicker } from '@/components/ui';
import { todayIso } from '@/utils/format';
import { addDaysIso } from '@/utils/pricing';
import { EXPLORE_SCOPES, normalizeExploreScope, parseExploreServices, writeExploreDates, writeExploreServices } from '@/utils/explore';
import { useOfferedServices } from '@/hooks/useOfferedServices';
import { cn } from '@/utils/cn';
import type { SearchResult } from '@/types';

const typeOptions = [
  { value: 'all', label: 'All listings' },
  ...EXPLORE_SCOPES.map((item) => ({ value: item.id, label: item.label })),
];

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
  const [wanted, setWanted] = useState(() => normalizeExploreScope(initialScope) || (parseExploreServices(initialService).length ? 'services' : 'all'));
  const [pickedServices, setPickedServices] = useState(() => parseExploreServices(initialService));
  const [open, setOpen] = useState(false);
  const [whatOpen, setWhatOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const whatBtnRef = useRef<HTMLButtonElement>(null);
  const whatPanelRef = useRef<HTMLDivElement>(null);
  const [whatPos, setWhatPos] = useState({ top: 0, left: 0, width: 320 });
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
    search(q, pickedServices.length ? 'businesses' : searchScopeOf(wanted))
      .then((rows) => { if (!cancelled) setSuggestions(rows.slice(0, 6)); })
      .catch(() => { if (!cancelled) setSuggestions([]); });
    return () => { cancelled = true; };
  }, [debounced, wanted, pickedServices]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      const target = e.target as Node;
      if (wrapRef.current?.contains(target) || whatPanelRef.current?.contains(target)) return;
      setOpen(false);
      setWhatOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => setActive(-1), [suggestions]);

  useEffect(() => {
    if (!whatOpen) return;
    const place = () => {
      const r = whatBtnRef.current?.getBoundingClientRect();
      if (!r) return;
      const width = Math.max(r.width, 320);
      const left = Math.min(r.left, Math.max(8, window.innerWidth - width - 8));
      setWhatPos({ top: r.bottom + 8, left, width });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [whatOpen]);

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
    setWhatOpen(false);
    onNavigate?.();
    navigate(withDates(href));
  };

  const exploreHref = (q: string) => {
    const next = new URLSearchParams();
    if (q) next.set('q', q);
    if (wanted !== 'all') next.set('scope', wanted);
    else if (pickedServices.length) next.set('scope', 'services');
    writeExploreServices(next, pickedServices);
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

  const listedServices = useMemo(() => {
    const extra = pickedServices.filter((id) => !serviceOptions.some((item) => item.id === id));
    return [...extra.map((id) => ({ id, label: id })), ...serviceOptions];
  }, [pickedServices, serviceOptions]);
  const filtersSet = Boolean(start || end || wanted !== 'all' || pickedServices.length);
  const whatLabel = pickedServices.length
    ? (wanted !== 'all' && wanted !== 'services'
      ? `${typeOptions.find((o) => o.value === wanted)?.label ?? wanted} · ${pickedServices.length === 1 ? pickedServices[0] : `${pickedServices.length} services`}`
      : pickedServices.length === 1 ? pickedServices[0] : `${pickedServices.length} services`)
    : (typeOptions.find((o) => o.value === wanted)?.label ?? 'All listings');
  const toggleService = (id: string) => {
    setPickedServices((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };
  const clearFilters = () => {
    setOpen(false);
    setWhatOpen(false);
    setStart('');
    setEnd('');
    setWanted('all');
    setPickedServices([]);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!suggestions.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => (a + 1) % suggestions.length); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => (a <= 0 ? suggestions.length - 1 : a - 1)); }
    if (e.key === 'Escape') { setOpen(false); setWhatOpen(false); }
    if (e.key === 'Enter' && active >= 0 && suggestions[active]) {
      e.preventDefault();
      go(suggestions[active].href);
    }
  };

  return (
    <div ref={wrapRef} className="relative z-40 w-full">
      <form
        role="search"
        onSubmit={submit}
        className={cn(
          'flex w-full items-stretch bg-white',
          hero
            ? 'flex-col gap-1 rounded-[1.75rem] border border-slate-100 p-2 shadow-lift xl:flex-row xl:items-center xl:gap-0 xl:rounded-full xl:p-1.5'
            : 'rounded-full border border-slate-300 focus-within:border-brand-600',
        )}
      >
        <label className={cn(hero ? 'flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-4 py-2 hover:bg-slate-50 xl:min-w-[16rem] xl:rounded-full xl:py-1' : 'flex flex-1 items-center gap-2 pl-3.5')}>
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
            <span className="hidden h-10 w-px shrink-0 bg-slate-200 xl:block" aria-hidden />
            <div className="grid grid-cols-2 gap-1 xl:contents">
              <div className="min-w-0 rounded-2xl px-1 hover:bg-slate-50 xl:rounded-full">
                <DatePicker compact embedded label="From" placeholder="Add date" min={todayIso()} value={start} onChange={onStart} />
              </div>
              <span className="hidden h-10 w-px shrink-0 bg-slate-200 xl:block" aria-hidden />
              <div className="min-w-0 rounded-2xl px-1 hover:bg-slate-50 xl:rounded-full">
                <DatePicker compact embedded label="To" placeholder="Add date" min={start || todayIso()} value={end} onChange={(iso) => { setOpen(false); setEnd(iso); }} />
              </div>
            </div>
            <span className="hidden h-10 w-px shrink-0 bg-slate-200 xl:block" aria-hidden />
            <div className="flex min-w-0 items-stretch gap-1 xl:contents">
              <div className="relative min-w-0 flex-1 xl:w-[13.5rem] xl:flex-none">
                <button
                  ref={whatBtnRef}
                  type="button"
                  id={`${listId}-scope`}
                  aria-haspopup="listbox"
                  aria-expanded={whatOpen}
                  onClick={() => { setWhatOpen((openNow) => !openNow); setOpen(false); }}
                  className="flex w-full min-w-0 flex-col rounded-2xl px-4 py-2 text-left hover:bg-slate-50 xl:rounded-full xl:py-1"
                >
                  <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">What</span>
                  <span className="flex h-7 items-center gap-1">
                    <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-ink">{whatLabel}</span>
                    <ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-400 transition', whatOpen && 'rotate-180')} aria-hidden />
                  </span>
                </button>
                {whatOpen && createPortal(
                  <div
                    ref={whatPanelRef}
                    style={{ top: whatPos.top, left: whatPos.left, width: whatPos.width }}
                    className="fixed z-[95] max-h-80 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-lift"
                  >
                    <p className="px-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">Browse</p>
                    <div className="mt-1" role="radiogroup" aria-label="Listing type">
                      {typeOptions.map((o) => (
                        <label key={o.value} className="flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-medium text-ink hover:bg-slate-50">
                          <input type="radio" name={`${listId}-browse`} checked={wanted === o.value} onChange={() => setWanted(o.value)} className="accent-brand-600" />
                          {o.label}
                        </label>
                      ))}
                    </div>
                    {listedServices.length > 0 && (
                      <>
                        <p className="mt-3 px-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">Services</p>
                        <p className="px-1 text-xs text-slate-500">Tick every extra you want on the same listing.</p>
                        <div className="mt-1" role="group" aria-label="Services">
                          {listedServices.map((item) => (
                            <label key={item.id} className="flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-medium text-ink hover:bg-slate-50">
                              <input type="checkbox" checked={pickedServices.includes(item.id)} onChange={() => toggleService(item.id)} className="accent-brand-600" />
                              {item.label}
                            </label>
                          ))}
                        </div>
                      </>
                    )}
                  </div>,
                  document.body,
                )}
              </div>
              {filtersSet && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="grid h-11 w-11 shrink-0 place-items-center self-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-ink xl:mx-1 xl:h-10 xl:w-10"
                  aria-label="Clear dates and listing type"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <button type="submit" className="inline-flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-full bg-brand-600 px-6 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 xl:h-14 xl:w-auto xl:px-8 xl:text-base">
              <Search className="h-4 w-4 xl:h-5 xl:w-5" aria-hidden />
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
