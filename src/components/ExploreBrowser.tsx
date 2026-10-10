import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { getBookings, getBusinesses, getLocations } from '@/services';
import { useAsync } from '@/hooks/useAsync';
import { BusinessCard } from '@/components/cards';
import { FilterButton, FilterPanel, type FilterGroup, type FilterValues } from '@/components/FilterPanel';
import { Button, EmptyState, ErrorState, fieldClass } from '@/components/ui';
import { ExploreReveal } from '@/components/ExploreReveal';
import { buildExploreItems, featuredRank, locationHaystack, sortItems, sortOptions, termsMatch, type ExploreItem, type SortKey } from '@/utils/explore';
import { cn } from '@/utils/cn';

const groups: FilterGroup[] = [
  { id: 'category', label: 'Category', type: 'checkbox', options: [
    { value: 'accommodation', label: 'Hotels, lodges & stays' },
    { value: 'restaurant', label: 'Restaurants' },
    { value: 'guide', label: 'Guides' },
    { value: 'business', label: 'Local businesses' },
  ] },
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

function applyFilters(
  items: ExploreItem[],
  q: string,
  f: FilterValues,
  locationId: string,
  locationDistrict: string,
  placeHits: { id: string; district: string }[],
) {
  return items.filter((it) => {
    if (it.type !== 'business') return false;
    if (locationId && it.node.locationId !== locationId && it.node.district !== locationDistrict) return false;
    if (q.trim()) {
      const textHit = termsMatch(it.text, q);
      const placeHit = placeHits.some((place) => it.node.locationId === place.id || it.node.district === place.district);
      if (!textHit && !placeHit) return false;
    }
    if (f.category?.length && !f.category.includes(it.kind)) return false;
    if (f.interest?.length && !f.interest.some((i) => it.interests.includes(i as never))) return false;
    if (f.province?.length && !f.province.some((p) => it.province.includes(p.replace(' Province', '')))) return false;
    if (f.price?.length && !f.price.includes(String(it.priceLevel))) return false;
    if (f.rating?.[0] && it.rating < Number(f.rating[0])) return false;
    if (f.sustainable?.length && !it.sustainable) return false;
    return true;
  });
}

const scopeToCategory: Record<string, string[]> = {
  accommodations: ['accommodation'],
  restaurants: ['restaurant'],
  businesses: ['business', 'guide'],
};

const quickFilters = [
  { value: 'accommodation', label: 'Stays' },
  { value: 'restaurant', label: 'Eat' },
  { value: 'guide', label: 'Guides' },
  { value: 'business', label: 'Makers' },
];

/** Filterable list of businesses. Search opens a listing, then the visitor picks what to book. */
export function ExploreBrowser({ showSearch = true, featuredFirst = false }: { showSearch?: boolean; featuredFirst?: boolean }) {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') ?? '');
  const [filters, setFilters] = useState<FilterValues>(() => {
    const cat = params.get('category');
    const interest = params.get('interest');
    return { ...(cat ? { category: [cat] } : {}), ...(interest ? { interest: [interest] } : {}) };
  });
  const [sort, setSort] = useState<SortKey>('recommended');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(6);
  const pageSize = 6;
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { data, loading, error, reload } = useAsync(async () => {
    const [l, b, bookings] = await Promise.all([getLocations(), getBusinesses(), getBookings()]);
    return {
      locations: l,
      items: buildExploreItems(l, [], b, bookings).filter((item) => item.type === 'business'),
    };
  });

  const qParam = params.get('q') ?? '';
  const scopeParam = params.get('scope') ?? '';
  const locationParam = params.get('location') ?? '';

  useEffect(() => { setQuery(qParam); }, [qParam]);
  useEffect(() => {
    const mapped = scopeToCategory[scopeParam];
    if (mapped) setFilters((current) => ({ ...current, category: mapped }));
  }, [scopeParam]);

  const placeHits = useMemo(() => {
    if (!query.trim() || !data) return [];
    return data.locations.filter((location) => termsMatch(locationHaystack(location), query)).map((location) => ({ id: location.id, district: location.district }));
  }, [data, query]);

  const selectedPlace = data?.locations.find((location) => location.id === locationParam);
  const placeLabel = selectedPlace?.name ?? '';
  const locationDistrict = selectedPlace?.district ?? '';

  const results = useMemo(() => {
    const sorted = sortItems(applyFilters(data?.items ?? [], query, filters, locationParam, locationDistrict, placeHits), sort);
    if (!featuredFirst || sort !== 'recommended') return sorted;
    return [...sorted].sort((a, b) => featuredRank(a) - featuredRank(b));
  }, [data, query, filters, sort, featuredFirst, locationParam, locationDistrict, placeHits]);
  const visible = results.slice(0, visibleCount);
  const hasMore = visibleCount < results.length;
  const activeCount = Object.values(filters).reduce((s, v) => s + v.length, 0);

  useEffect(() => { setVisibleCount(pageSize); }, [query, filters, sort, pageSize, locationParam]);

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

  return (
    <>
      <div className={cn('mb-6 flex flex-col gap-3', showSearch && 'sm:flex-row sm:items-center')}>
        {showSearch && (
          <label className="relative flex-1">
            <span className="sr-only">Search listings</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-600" aria-hidden />
            <input value={query} onChange={(e) => onQuery(e.target.value)} placeholder="Search stays, food, guides…" className={`${fieldClass} h-12 rounded-full pl-11`} />
          </label>
        )}
        <div className={cn('flex gap-2', !showSearch && 'justify-end')}>
          <FilterButton count={activeCount} onClick={() => setSheetOpen(true)} />
          <label className={cn(showSearch && 'flex-1 sm:flex-none')}>
            <span className="sr-only">Sort by</span>
            <select value={sort} onChange={(e) => { setVisibleCount(pageSize); setSort(e.target.value as SortKey); }} className={`${fieldClass} h-11 rounded-full font-semibold sm:w-48`}>
              {sortOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <FilterPanel groups={groups} values={filters} onChange={(next) => { setVisibleCount(pageSize); setFilters(next); }} open={sheetOpen} onClose={() => setSheetOpen(false)} resultCount={loading ? -1 : results.length} />
        <div>
          <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Quick category">
            <button type="button" onClick={() => setFilters((current) => ({ ...current, category: [] }))} className={cn('shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold', !filters.category?.length ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 text-slate-700')}>All</button>
            {quickFilters.map((item) => {
              const on = filters.category?.length === 1 && filters.category[0] === item.value;
              return (
                <button key={item.value} type="button" onClick={() => setFilters((current) => ({ ...current, category: on ? [] : [item.value] }))} className={cn('shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold', on ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 text-slate-700')}>{item.label}</button>
              );
            })}
          </div>
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
          {!loading && (
            <p className="mb-4 text-sm text-slate-600" aria-live="polite">{`${visible.length} of ${results.length} listing${results.length === 1 ? '' : 's'}`}</p>
          )}
          {loading ? <ExploreReveal /> : error ? <ErrorState message={error} onRetry={reload} /> : results.length === 0 ? (
            <EmptyState title="No listings match" message="Try a place or an offering, such as gorillas, coffee or Musanze." action={<Button variant="secondary" onClick={() => { setFilters({}); onQuery(''); clearPlace(); }}>Clear search and filters</Button>} />
          ) : (
            <>
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {visible.map((it) => it.type === 'business' ? <BusinessCard key={it.key} business={it.node} /> : null)}
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
