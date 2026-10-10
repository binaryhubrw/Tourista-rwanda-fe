import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { getBookings, getBusinesses, getExperiences, getLocations } from '@/services';
import { useAsync } from '@/hooks/useAsync';
import { BusinessCard, DestinationCard, ExperienceCard, ServiceCard } from '@/components/cards';
import { Pagination } from '@/components/dashboard';
import { FilterButton, FilterPanel, type FilterGroup, type FilterValues } from '@/components/FilterPanel';
import { Button, CardSkeletonGrid, EmptyState, ErrorState, fieldClass } from '@/components/ui';
import { buildExploreItems, featuredRank, sortItems, sortOptions, type ExploreItem, type SortKey } from '@/utils/explore';
import { cn } from '@/utils/cn';

const groups: FilterGroup[] = [
  { id: 'category', label: 'Category', type: 'checkbox', options: [
    { value: 'destination', label: 'Places & hidden gems' }, { value: 'experience', label: 'Cultural experiences' }, { value: 'accommodation', label: 'Hotels, lodges & stays' },
    { value: 'restaurant', label: 'Restaurants' }, { value: 'guide', label: 'Guides' }, { value: 'business', label: 'Local businesses' },
    { value: 'service', label: 'Rooms, services & food' },
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

function applyFilters(items: ExploreItem[], q: string, f: FilterValues) {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  return items.filter((it) => {
    const text = it.text.toLowerCase();
    if (terms.length && !terms.every((t) => text.includes(t))) return false;
    if (f.category?.length && !f.category.includes(it.kind)) return false;
    if (f.interest?.length && !f.interest.some((i) => it.interests.includes(i as never))) return false;
    if (f.province?.length && !f.province.some((p) => it.province.includes(p.replace(' Province', '')))) return false;
    if (f.price?.length && !f.price.includes(String(it.priceLevel))) return false;
    if (f.rating?.[0] && it.rating < Number(f.rating[0])) return false;
    if (f.sustainable?.length && !it.sustainable) return false;
    return true;
  });
}

export function ExploreCard({ item }: { item: ExploreItem }) {
  if (item.type === 'location') return <DestinationCard location={item.node} />;
  if (item.type === 'experience') return <ExperienceCard experience={item.node} />;
  if (item.type === 'service') return <ServiceCard service={item.node} business={item.business} />;
  return <BusinessCard business={item.node} />;
}

/** Filterable browser for places, experiences and local businesses. Used on /explore and the home page. */
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
  const [page, setPage] = useState(1);
  const pageSize = 9;

  const { data, loading, error, reload } = useAsync(async () => {
    const [l, e, b, bookings] = await Promise.all([getLocations(), getExperiences(), getBusinesses(), getBookings()]);
    return buildExploreItems(l, e, b, bookings);
  });

  const results = useMemo(() => {
    const sorted = sortItems(applyFilters(data ?? [], query, filters), sort);
    if (!featuredFirst || sort !== 'recommended') return sorted;
    return [...sorted].sort((a, b) => featuredRank(a) - featuredRank(b));
  }, [data, query, filters, sort, featuredFirst]);
  const pageCount = Math.max(1, Math.ceil(results.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visible = results.slice((safePage - 1) * pageSize, safePage * pageSize);
  const activeCount = Object.values(filters).reduce((s, v) => s + v.length, 0);

  const onQuery = (v: string) => {
    setPage(1);
    setQuery(v);
    const next = new URLSearchParams(params);
    if (v) next.set('q', v); else next.delete('q');
    setParams(next, { replace: true });
  };

  return (
    <>
      <div className={cn('mb-6 flex flex-col gap-3', showSearch && 'sm:flex-row sm:items-center')}>
        {showSearch && (
          <label className="relative flex-1">
            <span className="sr-only">Search places, activities, hotels, restaurants, guides and businesses</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-600" aria-hidden />
            <input value={query} onChange={(e) => onQuery(e.target.value)} placeholder="Search places, activities, hotels, restaurants, guides…" className={`${fieldClass} h-12 rounded-full pl-11`} />
          </label>
        )}
        <div className={cn('flex gap-2', !showSearch && 'justify-end')}>
          <FilterButton count={activeCount} onClick={() => setSheetOpen(true)} />
          <label className={cn(showSearch && 'flex-1 sm:flex-none')}>
            <span className="sr-only">Sort by</span>
            <select value={sort} onChange={(e) => { setPage(1); setSort(e.target.value as SortKey); }} className={`${fieldClass} h-11 rounded-full font-semibold sm:w-48`}>
              {sortOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <FilterPanel groups={groups} values={filters} onChange={(next) => { setPage(1); setFilters(next); }} open={sheetOpen} onClose={() => setSheetOpen(false)} resultCount={loading ? -1 : results.length} />
        <div>
          <p className="mb-4 text-sm text-slate-600" aria-live="polite">{loading ? 'Loading results…' : `${results.length} result${results.length === 1 ? '' : 's'}`}</p>
          {loading ? <CardSkeletonGrid count={6} className="xl:grid-cols-3 lg:grid-cols-2" /> : error ? <ErrorState message={error} onRetry={reload} /> : results.length === 0 ? (
            <EmptyState title="Nothing matches those filters" message="Try removing a filter or searching for a district name such as Musanze or Huye." action={<Button variant="secondary" onClick={() => { setFilters({}); onQuery(''); }}>Clear search and filters</Button>} />
          ) : (
            <>
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {visible.map((it) => <ExploreCard key={it.key} item={it} />)}
              </div>
              {pageCount > 1 && (
                <Pagination className="mt-6 rounded-2xl border border-slate-200 bg-white px-2" page={safePage} pageCount={pageCount} pageSize={pageSize} total={results.length} onPageChange={setPage} showPageSize={false} />
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
