import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, Store, TrendingUp, CalendarCheck } from 'lucide-react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useAuth } from '@/context/AuthContext';
import { Badge, ButtonLink, EmptyState, ErrorState, Loading } from '@/components/ui';
import {
  BarsChart, ChartCard, DataTable, DonutChart, FilterTabs, PageHeader, SERIES, StatCard, StatGrid, type Column,
} from '@/components/dashboard';
import { byMonth, periodTrend, sum } from '@/utils/analytics';
import { formatCompact, formatRwf, formatRwfShort } from '@/utils/format';
import { listingKindOf } from '@/utils/catalog';
import { useOwnerActivity } from './useOwnerBusinesses';
import type { Booking, Business } from '@/types';

const ranges = [{ value: '3', label: '3 months' }, { value: '6', label: '6 months' }, { value: '12', label: '12 months' }] as const;
type Range = (typeof ranges)[number]['value'];

const belongs = (b: Booking, id: string) => b.businessId === id || b.targetId === id;
const paid = (b: Booking) => b.status === 'Confirmed';
const seriesKey = (id: string) => `b_${id.replace(/[^a-zA-Z0-9]/g, '_')}`;

interface BranchRow {
  id: string;
  name: string;
  district: string;
  kind: string;
  bookings: number;
  confirmed: number;
  pending: number;
  refunded: number;
  guests: number;
  revenue: number;
  share: number;
  avg: number;
  last30: number;
  prev30: number;
  change: number | null;
  rating: number;
  reviews: number;
  topService: string;
}

function buildRows(businesses: Business[], bookings: Booking[]): BranchRow[] {
  const confirmed = bookings.filter(paid);
  const totalRevenue = sum(confirmed, (b) => b.totalRwf);
  return businesses.map((listing) => {
    const all = bookings.filter((b) => belongs(b, listing.id));
    const won = all.filter(paid);
    const revenue = sum(won, (b) => b.totalRwf);
    const trend = periodTrend(won, (b) => b.createdAt, (b) => b.totalRwf, 30);
    const byOffering = new Map<string, number>();
    won.forEach((b) => {
      const name = b.serviceName || b.targetName;
      byOffering.set(name, (byOffering.get(name) ?? 0) + b.totalRwf);
    });
    const top = [...byOffering.entries()].sort((a, b) => b[1] - a[1])[0];
    return {
      id: listing.id,
      name: listing.name,
      district: listing.district,
      kind: listingKindOf(listing),
      bookings: all.length,
      confirmed: won.length,
      pending: all.filter((b) => b.status === 'Pending').length,
      refunded: all.filter((b) => b.status === 'Refunded' || b.status === 'RefundPending').length,
      guests: sum(won, (b) => b.people),
      revenue,
      share: totalRevenue ? (revenue / totalRevenue) * 100 : 0,
      avg: won.length ? revenue / won.length : 0,
      last30: trend.current,
      prev30: trend.previous,
      change: trend.change,
      rating: listing.rating,
      reviews: listing.reviewCount,
      topService: top?.[0] ?? '—',
    };
  }).sort((a, b) => b.revenue - a.revenue);
}

const columns: Column<BranchRow>[] = [
  { id: 'name', header: 'Branch', sortValue: (r) => r.name, exportValue: (r) => r.name, cell: (r) => (
    <div className="min-w-0">
      <Link to={`/business-dashboard/business/${r.id}`} className="font-semibold text-ink hover:text-brand-700 hover:underline">{r.name}</Link>
      <p className="text-xs text-slate-500">{r.district}</p>
    </div>
  ) },
  { id: 'kind', header: 'Kind', sortValue: (r) => r.kind, exportValue: (r) => r.kind, cell: (r) => <Badge tone="solid">{r.kind}</Badge> },
  { id: 'bookings', header: 'Bookings', align: 'right', sortValue: (r) => r.bookings, exportValue: (r) => r.bookings, cell: (r) => <span className="tabular-nums">{r.bookings}</span> },
  { id: 'confirmed', header: 'Confirmed', align: 'right', sortValue: (r) => r.confirmed, exportValue: (r) => r.confirmed, cell: (r) => <span className="tabular-nums">{r.confirmed}</span> },
  { id: 'pending', header: 'Pending', align: 'right', sortValue: (r) => r.pending, exportValue: (r) => r.pending, cell: (r) => <span className="tabular-nums">{r.pending}</span> },
  { id: 'refunded', header: 'Refunds', align: 'right', sortValue: (r) => r.refunded, exportValue: (r) => r.refunded, cell: (r) => <span className="tabular-nums">{r.refunded}</span> },
  { id: 'guests', header: 'Guests', align: 'right', sortValue: (r) => r.guests, exportValue: (r) => r.guests, cell: (r) => <span className="tabular-nums">{r.guests}</span> },
  { id: 'revenue', header: 'Revenue', align: 'right', sortValue: (r) => r.revenue, exportValue: (r) => r.revenue, cell: (r) => <span className="whitespace-nowrap font-semibold tabular-nums text-ink">{formatRwf(r.revenue)}</span> },
  { id: 'share', header: 'Share', align: 'right', sortValue: (r) => r.share, exportValue: (r) => Number(r.share.toFixed(1)), cell: (r) => <span className="tabular-nums">{r.share.toFixed(1)}%</span> },
  { id: 'avg', header: 'Avg booking', align: 'right', sortValue: (r) => r.avg, exportValue: (r) => Math.round(r.avg), cell: (r) => <span className="whitespace-nowrap tabular-nums">{r.avg ? formatRwf(r.avg) : '—'}</span> },
  { id: 'last30', header: 'Last 30 days', align: 'right', sortValue: (r) => r.last30, exportValue: (r) => r.last30, cell: (r) => <span className="whitespace-nowrap tabular-nums">{formatRwf(r.last30)}</span> },
  { id: 'change', header: 'vs prior 30', align: 'right', sortValue: (r) => r.change ?? -Infinity, exportValue: (r) => r.change == null ? '' : Number(r.change.toFixed(1)), cell: (r) => {
    if (r.change == null) return <span className="text-slate-400">New</span>;
    const up = r.change >= 0;
    return <span className={`tabular-nums ${up ? 'text-teal-700' : 'text-rose-600'}`}>{up ? '+' : ''}{r.change.toFixed(0)}%</span>;
  } },
  { id: 'rating', header: 'Rating', align: 'right', sortValue: (r) => r.rating, exportValue: (r) => r.rating, cell: (r) => <span className="tabular-nums">{r.rating ? r.rating.toFixed(1) : 'New'}</span> },
  { id: 'reviews', header: 'Reviews', align: 'right', sortValue: (r) => r.reviews, exportValue: (r) => r.reviews, cell: (r) => <span className="tabular-nums">{r.reviews}</span> },
  { id: 'top', header: 'Top offering', sortValue: (r) => r.topService, exportValue: (r) => r.topService, cell: (r) => <span className="text-slate-600">{r.topService}</span> },
];

export default function BusinessAnalyticsPage() {
  useDocumentTitle('Analytics');
  const { user } = useAuth();
  const { data, loading, error, reload } = useOwnerActivity();
  const [range, setRange] = useState<Range>('12');
  const company = user!.businessName?.trim();
  const staff = user!.role === 'staff';
  const months = Number(range);

  const businesses = data?.businesses ?? [];
  const bookings = data?.bookings ?? [];
  const confirmed = useMemo(() => bookings.filter(paid), [bookings]);
  const rows = useMemo(() => (data ? buildRows(businesses, bookings) : []), [data, businesses, bookings]);
  const totalRevenue = sum(rows, (r) => r.revenue);
  const top = rows[0];
  const trend = periodTrend(confirmed, (b) => b.createdAt, (b) => b.totalRwf, 30);

  const monthly = useMemo(() => {
    const series = Object.fromEntries(businesses.map((b) => [
      seriesKey(b.id),
      (booking: Booking) => (belongs(booking, b.id) ? booking.totalRwf : 0),
    ])) as Record<string, (booking: Booking) => number>;
    return byMonth(confirmed, (b) => b.createdAt, series, months);
  }, [businesses, confirmed, months]);

  const branchSeries = useMemo(() => businesses.map((b, i) => ({
    key: seriesKey(b.id),
    label: b.name,
    color: SERIES[i % SERIES.length],
  })), [businesses]);

  const shareSlices = rows.map((r, i) => ({ name: r.name, value: r.revenue, color: SERIES[i % SERIES.length] }));
  const bookingBars = rows.map((r) => ({ name: r.name, confirmed: r.confirmed, pending: r.pending, refunded: r.refunded }));

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading || !data) return <Loading />;

  if (!businesses.length) {
    return (
      <>
        <PageHeader highlight={company} title="Analytics" intro={staff ? 'Revenue by assigned branch appears once the owner assigns branches to you.' : 'Add a branch to compare revenue across your locations.'} />
        <EmptyState title={staff ? 'No assigned branches' : 'No branches yet'} message={staff ? 'Ask the owner to assign a branch.' : 'Publish a branch, then bookings will split revenue by location here.'} action={staff ? undefined : <ButtonLink to="/business-dashboard/business/new">Add branch</ButtonLink>} />
      </>
    );
  }

  return (
    <>
      <div className="mb-3">
        <FilterTabs label="Time range" value={range} onChange={setRange} options={ranges.map((r) => ({ value: r.value, label: r.label }))} />
      </div>
      <PageHeader
        highlight={company}
        title="Analytics"
        intro={`Confirmed revenue compared across ${rows.length} branch${rows.length === 1 ? '' : 'es'}${company ? ` for ${company}` : ''}. Charts use the last ${months} months; the table is the full record.`}
      />

      <StatGrid>
        <StatCard label="Confirmed revenue" icon={Wallet} value={formatRwfShort(totalRevenue)} sparkline={monthly.map((m) => sum(branchSeries, (s) => Number(m[s.key as keyof typeof m] ?? 0)))} trend={{ value: trend.change, label: 'vs previous 30 days' }} />
        <StatCard label="Leading branch" icon={Store} tone="teal" value={top?.name ?? '—'} hint={top ? `${top.share.toFixed(1)}% · ${formatRwfShort(top.revenue)}` : 'No confirmed bookings yet'} to={top ? `/business-dashboard/business/${top.id}` : undefined} />
        <StatCard label="Confirmed bookings" icon={CalendarCheck} tone="violet" value={sum(rows, (r) => r.confirmed)} hint={`${bookings.length} requests in total`} to="/business-dashboard/bookings" />
        <StatCard label="Spread" icon={TrendingUp} tone="amber" value={rows.length > 1 && totalRevenue ? `${Math.round(100 - (top?.share ?? 0))}%` : '—'} hint={rows.length > 1 ? 'Revenue outside the leading branch' : 'Need more than one branch to compare'} />
      </StatGrid>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <ChartCard title="Revenue per branch" description={`Confirmed bookings · ${formatRwf(totalRevenue)} in total`} className="xl:col-span-2">
          <BarsChart
            data={rows}
            xKey="name"
            layout="vertical"
            series={[{ key: 'revenue', label: 'Revenue' }]}
            valueFormatter={formatRwf}
            axisFormatter={formatRwfShort}
            height={Math.max(240, rows.length * 56)}
            categoryWidth={168}
          />
        </ChartCard>
        <ChartCard title="Share of revenue" description="How confirmed revenue splits">
          <DonutChart data={shareSlices} valueFormatter={formatRwfShort} centerValue={formatRwfShort(totalRevenue).replace('RWF ', '')} centerLabel="RWF" height={220} />
        </ChartCard>
      </div>

      <ChartCard className="mt-6" title="Monthly revenue by branch" description={`Stacked confirmed revenue, last ${months} months`}>
        <BarsChart
          data={monthly}
          xKey="month"
          stacked
          series={branchSeries}
          valueFormatter={formatRwf}
          axisFormatter={formatCompact}
          height={320}
        />
      </ChartCard>

      <ChartCard className="mt-6" title="Bookings per branch" description="Confirmed, pending and refunds">
        <BarsChart
          data={bookingBars}
          xKey="name"
          layout="vertical"
          series={[
            { key: 'confirmed', label: 'Confirmed', color: SERIES[0] },
            { key: 'pending', label: 'Pending', color: SERIES[1] },
            { key: 'refunded', label: 'Refunds', color: SERIES[3] },
          ]}
          height={Math.max(240, rows.length * 56)}
          categoryWidth={168}
        />
      </ChartCard>

      <DataTable
        className="mt-6"
        title="Branch comparison"
        description="Every assigned branch, with confirmed revenue, share, guests and the last 30 days. Export the full table."
        data={rows}
        columns={columns}
        getRowId={(r) => r.id}
        initialSort={{ id: 'revenue', desc: true }}
        initialPageSize={25}
        searchText={(r) => `${r.name} ${r.kind} ${r.district} ${r.topService}`}
        searchPlaceholder="Search branches"
        exportFileName="branch-revenue"
        rowActions={(r) => <ButtonLink to={`/business-dashboard/business/${r.id}`} size="sm" variant="secondary">Open</ButtonLink>}
      />
    </>
  );
}
