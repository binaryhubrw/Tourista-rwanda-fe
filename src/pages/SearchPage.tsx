import { useSearchParams } from 'react-router-dom';
import { SearchX } from 'lucide-react';
import { search, type SearchScope } from '@/services/searchService';
import { useAsync } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { SearchBar, scopeOptions } from '@/components/layout/SearchBar';
import { SearchResultCard } from '@/components/cards';
import { ButtonLink, Container, EmptyState, ErrorState, Skeleton } from '@/components/ui';
import { cn } from '@/utils/cn';

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const scope = (params.get('scope') as SearchScope) || 'all';
  useDocumentTitle(q ? `Search: ${q}` : 'Search');
  const { data, loading, error, reload } = useAsync(() => (q ? search(q, scope) : Promise.resolve([])), [q, scope]);

  return (
    <Container className="py-8 lg:py-12">
      <div className="max-w-3xl">
        <SearchBar key={q} initialQuery={q} />
        <div role="tablist" aria-label="Search in" className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {scopeOptions.map((o) => (
            <button key={o.value} role="tab" aria-selected={scope === o.value} onClick={() => setParams({ q, scope: o.value })} className={cn('shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-semibold', scope === o.value ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 text-slate-700')}>{o.label}</button>
          ))}
        </div>
      </div>

      <h1 className="mt-8 font-display text-2xl font-bold text-ink" aria-live="polite">
        {!q ? 'Search Tourista Rwanda' : loading ? `Searching for “${q}”…` : `${data?.length ?? 0} result${data?.length === 1 ? '' : 's'} for “${q}”`}
      </h1>

      <div className="mt-6">
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[120px]" />)}</div>
        ) : error ? <ErrorState message={error} onRetry={reload} /> : !q ? (
          <EmptyState title="What are you looking for?" message="Search for a place, activity, hotel, restaurant, guide or local business." />
        ) : !data?.length ? (
          <EmptyState icon={<SearchX className="h-7 w-7" />} title={`No results for “${q}”`} message="Check the spelling, try a broader word like “lake” or “coffee”, or search everything instead of one category." action={<ButtonLink to="/explore" variant="secondary">Browse everything</ButtonLink>} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">{data.map((r) => <SearchResultCard key={`${r.type}-${r.id}`} result={r} />)}</div>
        )}
      </div>
    </Container>
  );
}
