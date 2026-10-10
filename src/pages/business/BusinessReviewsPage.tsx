import { useMemo, useState } from 'react';
import { Star, MessageSquare, ThumbsUp, CalendarDays } from 'lucide-react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { ErrorState, Loading } from '@/components/ui';
import { BarsChart, ChartCard, DataTable, FilterTabs, PageHeader, StatCard, StatGrid } from '@/components/dashboard';
import { reviewColumns, reviewSearchText } from '../shared/tableColumns';
import { average, byMonth, periodTrend } from '@/utils/analytics';
import { useOwnerActivity } from './useOwnerBusinesses';

const ratingFilters = ['All', '5', '4', '3', '2', '1'] as const;
type RatingFilter = (typeof ratingFilters)[number];

export default function BusinessReviewsPage() {
  useDocumentTitle('Reviews');
  const { data, loading, error, reload } = useOwnerActivity();
  const [filter, setFilter] = useState<RatingFilter>('All');
  const all = data?.reviews ?? [];
  const multipleListings = (data?.businesses.length ?? 0) > 1;
  const columns = useMemo(() => reviewColumns(multipleListings ? ['author', 'target', 'rating', 'comment', 'date'] : ['author', 'rating', 'comment', 'date']), [multipleListings]);
  const list = useMemo(() => all.filter((r) => filter === 'All' || r.rating === Number(filter)), [all, filter]);

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading) return <Loading />;

  const avg = all.length ? average(all.map((r) => r.rating)) : 0;
  const fiveStar = all.filter((r) => r.rating === 5).length;
  const recent = periodTrend(all, (r) => r.date, () => 1, 90);
  const dist = [5, 4, 3, 2, 1].map((n) => ({ stars: `${n} star${n > 1 ? 's' : ''}`, reviews: all.filter((r) => r.rating === n).length }));
  const monthly = byMonth(all, (r) => r.date, { reviews: () => 1 });

  return (
    <>
      <PageHeader title="Reviews" intro="What travellers say about your business." />

      <StatGrid>
        <StatCard label="Average rating" icon={Star} tone="amber" value={avg ? avg.toFixed(1) : 'New'} hint="Out of 5 stars" />
        <StatCard label="Total reviews" icon={MessageSquare} value={all.length} sparkline={monthly.map((m) => m.reviews)} />
        <StatCard label="5-star reviews" icon={ThumbsUp} tone="teal" value={all.length ? `${Math.round((fiveStar / all.length) * 100)}%` : '—'} hint={`${fiveStar} of ${all.length}`} />
        <StatCard label="Last 90 days" icon={CalendarDays} tone="violet" value={recent.current} trend={{ value: recent.change, label: 'vs previous 90 days' }} />
      </StatGrid>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <ChartCard title="Rating distribution">
            <BarsChart data={dist} xKey="stars" layout="vertical" series={[{ key: 'reviews', label: 'Reviews' }]} height={220} categoryWidth={64} />
          </ChartCard>
          <ChartCard title="Reviews per month" description="Last 12 months">
            <BarsChart data={monthly} xKey="month" series={[{ key: 'reviews', label: 'Reviews' }]} height={220} />
          </ChartCard>
        </div>

      <DataTable
        className="mt-6"
        data={list}
        columns={columns}
        getRowId={(r) => r.id}
        initialSort={{ id: 'date', desc: true }}
        searchText={reviewSearchText}
        searchPlaceholder="Search reviews"
        filters={<FilterTabs label="Filter by rating" value={filter} onChange={setFilter} options={ratingFilters.map((f) => ({ value: f, label: f === 'All' ? 'All' : `${f}★`, count: f === 'All' ? all.length : all.filter((r) => r.rating === Number(f)).length }))} />}
        exportFileName="business-reviews"
        emptyTitle="No reviews yet"
        emptyMessage="Reviews appear here after guests write them on your public page."
      />
    </>
  );
}
