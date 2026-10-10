import { useMemo, useState } from 'react';
import { getExperiences } from '@/services';
import { useAsync } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { ExperienceCard } from '@/components/cards';
import { CardSkeletonGrid, Container, EmptyState, ErrorState, PageHeader } from '@/components/ui';
import { cn } from '@/utils/cn';

export default function ExperiencesPage() {
  useDocumentTitle('Experiences');
  const { data, loading, error, reload } = useAsync(getExperiences);
  const [type, setType] = useState('All');
  const [communityOnly, setCommunityOnly] = useState(false);
  const types = useMemo(() => ['All', ...new Set((data ?? []).map((e) => e.type))], [data]);
  const list = (data ?? []).filter((e) => (type === 'All' || e.type === type) && (!communityOnly || e.communityLed));

  return (
    <>
      <PageHeader title="Experiences" intro="Traditional dance, food walks, coffee harvests, village stays and historical tours, hosted by local people." />
      <Container className="py-8 lg:py-10">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div role="tablist" aria-label="Experience type" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
            {types.map((t) => (
              <button key={t} role="tab" aria-selected={type === t} onClick={() => setType(t)} className={cn('shrink-0 rounded-full border px-4 py-2 text-sm font-semibold', type === t ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 text-slate-700 hover:border-brand-400')}>{t}</button>
            ))}
          </div>
          <label className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-ink">
            <input type="checkbox" checked={communityOnly} onChange={(e) => setCommunityOnly(e.target.checked)} className="h-4 w-4 accent-brand-600" />
            Community-led only
          </label>
        </div>
        {loading ? <CardSkeletonGrid /> : error ? <ErrorState message={error} onRetry={reload} /> : list.length === 0 ? <EmptyState title="No experiences match" message="Try another type or include all hosts." /> : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{list.map((e) => <ExperienceCard key={e.id} experience={e} />)}</div>
        )}
      </Container>
    </>
  );
}
