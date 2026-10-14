import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { getAvailability, getBusinesses, getLocations } from '@/services';
import { useAsync } from '@/hooks/useAsync';
import { BusinessCard, ServiceCard } from '@/components/cards';
import { FilterButton, FilterPanel, type FilterGroup, type FilterValues } from '@/components/FilterPanel';
import { Button, DatePicker, EmptyState, ErrorState, fieldClass } from '@/components/ui';
import { ExploreReveal } from '@/components/ExploreReveal';
import type { Booking } from '@/types';
import {
  EXPLORE_SCOPES, buildExploreItems, businessHasAvailableServices, businessMatchesScope, exploreDatesFromSearch, featuredRank, locationHaystack, normalizeExploreScope, parseExploreServices, scopeHasAvailability, sortItems, sortOptions, termsMatch, writeExploreDates,
  type ExploreItem, type ExploreScope, type SortKey,
} from '@/utils/explore';
import { formatDate, todayIso } from '@/utils/format';
import { addDaysIso } from '@/utils/pricing';
import { cn } from '@/utils/cn';

const groups: FilterGroup[] = [
  { id: 'category', label: 'Category', type: 'checkbox', options: EXPLORE_SCOPES.map((item) => ({ value: item.id, label: item.label })) },
  { id: 'interest', label: 'Interests', type: 'checkbox', options: [
    { value: 'Culture', label: 'Cultural experiences' }, { value: 'Nature', label: 'Nature' }, { value: 'Adventure', label: 'Adventure' },
    { value: 'Food', label: 'Food' }, { value: 'Wildlife', label: 'Wildlife' }, { value: 'History', label: 'History' },
  ] },
  { id: 'province', label: 'Location', type: 'checkbox', options: [
    'City of Kigali', 'Northern Province', 'Southern Province', 'Eastern Province', 'Western Province',
  ].map((p) => ({ value: p, label: p })) },
  { id: 'price', label: 'Price', type: 'checkbox', options: [{ value: '1', label: 'Budget' }, { value: '2', label: 'Mid-range' }, { value: '3', label: 'Premium' }] },
  { id: 'rating', label: 'Rating', type: 'radio', options: [{ value: '4.5', label: '4.5 and above' }, { value: '4', label: '4.0 and above' }] },
  { id: 'sustainable', label: 'Sustainable tourism', type: 'checkbox', options: [{ value: 'yes', label: 'Eco-certified or community-led only' }] },
];

function selectedScopes(f: FilterValues): ExploreScope[] {
  return (f.category ?? []).map((value) => normalizeExploreScope(value)).filter((scope): scope is ExploreScope => Boolean(scope));
}

function applyFilters(
  items: ExploreItem[],
  q: string,
  f: FilterValues,
  locationId: string,
  locationDistrict: string,
  placeHits: { id: string; district: string }[],
  services: string[],
  bookings: Booking[],
  start?: string,
  end?: string,
) {
  const scopes = selectedScopes(f);
  const wantVehicles = !scopes.length || scopes.includes('vehicles');
  const wantBusinesses = !scopes.length || scopes.some((scope) => scope !== 'vehicles');
  const extras = services.filter(Boolean);
  return items.filter((it) => {
    const listing = it.type === 'business' ? it.node : it.type === 'service' ? it.business : null;
    if (!listing) return false;
    if (it.type === 'service' && it.kind === 'vehicle') {
      if (extras.length || !wantVehicles) return false;
    } else if (it.type === 'business') {
      if (!wantBusinesses) return false;
      if (extras.length && !businessHasAvailableServices(listing, extras, bookings, start, end)) return false;
      const scopesToMatch = extras.length ? scopes.filter((scope) => scope !== 'services') : scopes;
      if (scopesToMatch.length && !scopesToMatch.some((scope) => businessMatchesScope(listing, scope) && scopeHasAvailability(listing, scope, bookings, start, end))) return false;
    } else {
      return false;
    }
    if (locationId && listing.locationId !== locationId && listing.district !== locationDistrict) return false;
    if (q.trim()) {
      const textHit = termsMatch(it.text, q);
      const placeHit = placeHits.some((place) => listing.locationId === place.id || listing.district === place.district);
      if (!textHit && !placeHit) return false;
    }
    if (f.interest?.length && !f.interest.some((i) => it.interests.includes(i as never))) return false;
    if (f.province?.length && !f.province.some((p) => it.province.includes(p.replace(' Province', '')))) return false;
    if (f.price?.length && !f.price.includes(String(it.priceLevel))) return false;
    if (f.rating?.[0] && it.rating < Number(f.rating[0])) return false;
    if (f.sustainable?.length && !it.sustainable) return false;
    return true;
  });
}

const quickFilters = EXPLORE_SCOPES;

/** Filterable list of businesses. Search opens a listing, then the visitor picks what to book. */
export function ExploreBrowser({ showSearch = true, featuredFirst = false }: { showSearch?: boolean; featuredFirst?: boolean }) {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') ?? '');
  const [filters, setFilters] = useState<FilterValues>(() => {
    const scope = normalizeExploreScope(params.get('scope') ?? params.get('category'));
    const interest = params.get('interest');
    return { ...(scope ? { category: [scope] } : {}), ...(interest ? { interest: [interest] } : {}) };
  });
  const [sort, setSort] = useState<SortKey>('recommended');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(6);
  const pageSize = 6;
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { data, loading, error, reload } = useAsync(async () => {
    const [locations, businesses, bookings] = await Promise.all([getLocations(), getBusinesses(), getAvailability()]);
    return { locations, businesses, bookings };
  });

  const qParam = params.get('q') ?? '';
  const scopeParam = params.get('scope') ?? '';
  const locationParam = params.get('location') ?? '';
  const serviceParam = parseExploreServices(params.get('service'));
  const serviceKey = serviceParam.join(',');
  const { start: checkin, end: checkout } = exploreDatesFromSearch(params);

  useEffect(() => { setQuery(qParam); }, [qParam]);
  useEffect(() => {
    const scope = normalizeExploreScope(scopeParam);
    setFilters((current) => {
      const prev = current.category ?? [];
      if (scope) {
        if (prev.length === 1 && prev[0] === scope) return current;
        return { ...current, category: [scope] };
      }
      if (prev.length <= 1) {
        if (!prev.length) return current;
        return { ...current, category: [] };
      }
      return current;
    });
  }, [scopeParam]);

  const placeHits = useMemo(() => {
    if (!query.trim() || !data) return [];
    return data.locations.filter((location) => termsMatch(locationHaystack(location), query)).map((location) => ({ id: location.id, district: location.district }));
  }, [data, query]);

  const selectedPlace = data?.locations.find((location) => location.id === locationParam);
  const placeLabel = selectedPlace?.name ?? '';
  const locationDistrict = selectedPlace?.district ?? '';
  const items = useMemo(() => {
    if (!data) return [];
    return buildExploreItems(data.locations, [], data.businesses, data.bookings, { start: checkin, end: checkout })
      .filter((item) => item.type === 'business' || (item.type === 'service' && item.kind === 'vehicle'));
  }, [data, checkin, checkout]);

  const results = useMemo(() => {
    const sorted = sortItems(applyFilters(items, query, filters, locationParam, locationDistrict, placeHits, serviceParam, data?.bookings ?? [], checkin, checkout), sort);
    if (!featuredFirst || sort !== 'recommended') return sorted;
    return [...sorted].sort((a, b) => featuredRank(a) - featuredRank(b));
  }, [items, query, filters, sort, featuredFirst, locationParam, locationDistrict, placeHits, serviceKey, data?.bookings, checkin, checkout]);
  const visible = results.slice(0, visibleCount);
  const hasMore = visibleCount < results.length;
  const activeCount = Object.values(filters).reduce((s, v) => s + v.length, 0);

  useEffect(() => { setVisibleCount(pageSize); }, [query, filters, sort, pageSize, locationParam, serviceKey, checkin, checkout]);

  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) setVisibleCount((count) => count + pageSize);
    }, { rootMargin: '120px 0px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, visible.length, pageSize]);

  const onQuery = (v: string) => {
    setVisibleCount(pageSize);
    setQuery(v);
    const next = new URLSearchParams(params);
    if (v) next.set('q', v); else next.delete('q');
    setParams(next, { replace: true });
  };

  const clearPlace = () => {
    const next = new URLSearchParams(params);
    next.delete('location');
    setParams(next, { replace: true });
  };

  const setCategories = (category: string[]) => {
    setVisibleCount(pageSize);
    setFilters((current) => ({ ...current, category }));
    const next = new URLSearchParams(params);
    const scope = category.length === 1 ? normalizeExploreScope(category[0]) : '';
    if (scope) next.set('scope', scope); else next.delete('scope');
    setParams(next, { replace: true });
  };

  const clearService = () => {
    const next = new URLSearchParams(params);
    next.delete('service');
    setParams(next, { replace: true });
  };

  const setDates = (start: string, end: string) => {
    const next = writeExploreDates(new URLSearchParams(params), start, end);
    setParams(next, { replace: true });
  };

  const onCheckin = (iso: string) => {
    setDates(iso, iso && (!checkout || checkout <= iso) ? addDaysIso(iso, 1) : checkout);
  };

  const clearDates = () => setDates('', '');

  return (
    <>
      <div className={cn('mb-6 flex flex-col gap-3', showSearch && 'sm:flex-row sm:items-center')}>
        {showSearch && (
          <label className="relative flex-1">
            <span className="sr-only">Search listings</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-600" aria-hidden />
            <input value={query} onChange={(e) => onQuery(e.target.value)} placeholder="Search stays, food, cars, guides…" className={`${fieldClass} h-12 rounded-full pl-11`} />
          </label>
        )}
        <div className={cn('flex min-w-0 flex-wrap gap-2', !showSearch && 'justify-end')}>
          <FilterButton count={activeCount} onClick={() => setSheetOpen(true)} />
          <label className={cn('min-w-0', showSearch && 'flex-1 sm:flex-none')}>
            <span className="sr-only">Sort by</span>
            <select value={sort} onChange={(e) => { setVisibleCount(pageSize); setSort(e.target.value as SortKey); }} className={`${fieldClass} h-11 min-w-0 rounded-full font-semibold sm:w-48`}>
              {sortOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <FilterPanel groups={groups} values={filters} onChange={(next) => {
          setVisibleCount(pageSize);
          setFilters(next);
          const nextParams = new URLSearchParams(params);
          const scope = (next.category ?? []).length === 1 ? normalizeExploreScope(next.category![0]) : '';
          if (scope) nextParams.set('scope', scope); else nextParams.delete('scope');
          setParams(nextParams, { replace: true });
        }} open={sheetOpen} onClose={() => setSheetOpen(false)} resultCount={loading ? -1 : results.length} />
        <div>
          <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Quick category">
            <button type="button" onClick={() => setCategories([])} className={cn('shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold', !filters.category?.length ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 text-slate-700')}>All</button>
            {quickFilters.map((item) => {
              const on = filters.category?.length === 1 && filters.category[0] === item.id;
              return (
                <button key={item.id} type="button" onClick={() => setCategories(on ? [] : [item.id])} className={cn('shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold', on ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 text-slate-700')}>{item.label}</button>
              );
            })}
          </div>
          {serviceParam.length > 0 && (
            <p className="mb-3 text-sm text-slate-600">
              Businesses offering {serviceParam.join(', ')}.{' '}
              <button type="button" onClick={clearService} className="font-semibold text-brand-600 hover:underline">Show all services</button>
            </p>
          )}
          {selectedScopes(filters).length === 1 && selectedScopes(filters)[0] === 'vehicles' && (
            <p className="mb-3 text-sm text-slate-600">Every hire car with its daily price and the business that offers it. Choose the one you want.</p>
          )}
          {locationParam && placeLabel && (
            <p className="mb-3 text-sm text-slate-600">
              Listings at {placeLabel}.{' '}
              <button type="button" onClick={clearPlace} className="font-semibold text-brand-600 hover:underline">Show all listings</button>
            </p>
          )}
          {query.trim() && (
            <p className="mb-3 text-sm text-slate-600">
              Businesses matching “{query.trim()}”.{' '}
              <button type="button" onClick={() => onQuery('')} className="font-semibold text-brand-600 hover:underline">Clear search</button>
            </p>
          )}
          <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:max-w-md">
            <DatePicker compact label="From" placeholder="Start date" min={todayIso()} value={checkin} onChange={onCheckin} />
            <DatePicker compact label="To" placeholder="End date" min={checkin || todayIso()} value={checkout} onChange={(iso) => {
              if (!iso) { setDates(checkin, ''); return; }
              if (!checkin) setDates(iso, addDaysIso(iso, 1));
              else setDates(checkin, iso <= checkin ? addDaysIso(checkin, 1) : iso);
            }} />
          </div>
          {checkin && (
            <p className="mb-3 text-sm text-slate-600">
              Available {formatDate(checkin)}{checkout && checkout !== checkin ? ` – ${formatDate(checkout)}` : ''}.{' '}
              <button type="button" onClick={clearDates} className="font-semibold text-brand-600 hover:underline">Clear dates</button>
            </p>
          )}
          {!loading && (
            <p className="mb-4 text-sm text-slate-600" aria-live="polite">
              {`${visible.length} of ${results.length} ${selectedScopes(filters)[0] === 'vehicles' && selectedScopes(filters).length === 1 ? (results.length === 1 ? 'vehicle' : 'vehicles') : (results.length === 1 ? 'listing' : 'listings')}`}
            </p>
          )}
          {loading ? <ExploreReveal /> : error ? <ErrorState message={error} onRetry={reload} /> : results.length === 0 ? (
            <EmptyState title={checkin ? 'Nothing is free for those dates' : 'No listings match'} message={checkin ? 'Try another date range, or clear the dates to see what is open today.' : 'Try a place or an offering, such as gorillas, coffee or Musanze.'} action={<Button variant="secondary" onClick={() => { setCategories([]); onQuery(''); clearPlace(); clearService(); clearDates(); setFilters({}); }}>Clear search and filters</Button>} />
          ) : (
            <>
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {visible.map((it) => (
                  it.type === 'business' ? <BusinessCard key={it.key} business={it.node} checkin={checkin} checkout={checkout} />
                    : it.type === 'service' ? <ServiceCard key={it.key} service={it.node} business={it.business} checkin={checkin} checkout={checkout} />
                    : null
                ))}
              </div>
              {hasMore && (
                <div ref={sentinelRef} className="mt-8" aria-live="polite">
                  <ExploreReveal count={3} compact />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
