import { useMemo, useState } from 'react';
import { getReviews } from '@/services';
import { useAsync } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { ReviewCard } from '@/components/cards';
import { CardSkeletonGrid, Container, EmptyState, ErrorState, PageHeader, fieldClass } from '@/components/ui';
import { cn } from '@/utils/cn';

export default function ReviewsPage() {
  useDocumentTitle('Reviews & community');
  const { data, loading, error, reload } = useAsync(() => getReviews());
  const [stars, setStars] = useState(0);
  const [type, setType] = useState<'all' | 'location' | 'experience' | 'business'>('all');
  const list = useMemo(() => (data ?? []).filter((r) => (!stars || r.rating === stars) && (type === 'all' || r.targetType === type)), [data, stars, type]);

  return (
    <>
      <PageHeader title="Reviews & community" intro="Honest notes from travellers who've been there. To write a review, open a listing." />
      <Container className="py-8 lg:py-10">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="group" aria-label="Filter by rating">
            {[0, 5, 4, 3, 2, 1].map((s) => (
              <button key={s} aria-pressed={stars === s} onClick={() => setStars(s)} className={cn('shrink-0 rounded-full border px-4 py-2 text-sm font-semibold', stars === s ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 text-slate-700')}>
                {s ? `${s} star${s > 1 ? 's' : ''}` : 'All ratings'}
              </button>
            ))}
          </div>
          <label>
            <span className="sr-only">Review type</span>
            <select value={type} onChange={(e) => setType(e.target.value as typeof type)} className={`${fieldClass} h-11 rounded-full font-semibold sm:w-52`}>
              <option value="all">Everything reviewed</option>
              <option value="location">Destinations</option>
              <option value="experience">Experiences</option>
              <option value="business">Businesses</option>
            </select>
          </label>
        </div>
        {loading ? <CardSkeletonGrid count={4} className="lg:grid-cols-2" /> : error ? <ErrorState message={error} onRetry={reload} /> : !list.length ? (
          <EmptyState title="No reviews match this filter" />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">{list.map((r) => <ReviewCard key={r.id} review={r} showTarget />)}</div>
        )}
      </Container>
    </>
  );
}
