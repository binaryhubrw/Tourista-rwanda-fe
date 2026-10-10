import { useMemo, useState } from 'react';
import { getLocations } from '@/services';
import { useAsync } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { DestinationCard } from '@/components/cards';
import { CardSkeletonGrid, Container, EmptyState, ErrorState, PageHeader, fieldClass } from '@/components/ui';
import { sortItems, sortOptions, type SortKey } from '@/utils/explore';
import type { LocationCategory } from '@/types';
import { cn } from '@/utils/cn';

const categories: ('All' | LocationCategory)[] = ['All', 'City', 'National Park', 'Lake', 'Town', 'Cultural Site', 'Hidden Gem'];

export default function DestinationsPage() {
  useDocumentTitle('Destinations');
  const { data, loading, error, reload } = useAsync(getLocations);
  const [cat, setCat] = useState<(typeof categories)[number]>('All');
  const [sort, setSort] = useState<SortKey>('popular');

  const list = useMemo(() => {
    const items = (data ?? []).filter((l) => cat === 'All' || l.category === cat).map((l) => ({ ...l, popularity: l.visitsLastYear, sustainable: !!l.isHiddenGem }));
    return sortItems(items, sort);
  }, [data, cat, sort]);

  return (
    <>
      <PageHeader title="Destinations" intro="National parks, lakes, towns and cultural sites across all five provinces." />
      <Container className="py-8 lg:py-10">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div role="tablist" aria-label="Destination type" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
            {categories.map((c) => (
              <button key={c} role="tab" aria-selected={cat === c} onClick={() => setCat(c)} className={cn('shrink-0 rounded-full border px-4 py-2 text-sm font-semibold', cat === c ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 text-slate-700 hover:border-brand-400')}>
                {c === 'All' ? 'All' : c === 'Hidden Gem' ? 'Hidden gems' : `${c}s`}
              </button>
            ))}
          </div>
          <label className="shrink-0">
            <span className="sr-only">Sort by</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className={`${fieldClass} h-11 rounded-full font-semibold md:w-48`}>
              {sortOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
        </div>
        {loading ? <CardSkeletonGrid /> : error ? <ErrorState message={error} onRetry={reload} /> : list.length === 0 ? <EmptyState title="No destinations in this category yet" /> : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{list.map((l) => <DestinationCard key={l.id} location={l} />)}</div>
        )}
      </Container>
    </>
  );
}
