import { useMemo, useState } from 'react';
import { Users, Home, Plane, TrendingUp, Building2, Leaf, CalendarCheck, Wallet } from 'lucide-react';
import type { Location, PaymentMethod } from '@/types';
import { getBookings, getBusinesses, getLocations, getTourismStatistics } from '@/services';
import { useAsync } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Badge, ErrorState, Loading } from '@/components/ui';
import { BOOKING_STATUSES, BarsChart, ChartCard, DataTable, DonutChart, FilterTabs, PageHeader, StatCard, StatGrid, TrendChart, bookingStatusColor, type Column } from '@/components/dashboard';
import { average, byMonth, countBy, percentChange, sum } from '@/utils/analytics';
import { formatCompact, formatRwfShort } from '@/utils/format';
import { listingKindOf } from '@/utils/catalog';
import { paymentMethodLabel } from '@/utils/payment';

const ranges = [{ value: '3', label: '3 months' }, { value: '6', label: '6 months' }, { value: '12', label: '12 months' }] as const;
type Range = (typeof ranges)[number]['value'];
const views = [{ value: 'visitors', label: 'Visitors' }, { value: 'businesses', label: 'Businesses' }, { value: 'bookings', label: 'Bookings' }] as const;
type View = (typeof views)[number]['value'];

const locationColumns: Column<Location>[] = [
  { id: 'name', header: 'Location', sortValue: (l) => l.name, cell: (l) => <span className="font-semibold text-ink">{l.name}</span> },
  { id: 'province', header: 'Province', sortValue: (l) => l.province, cell: (l) => l.province },
  { id: 'category', header: 'Category', sortValue: (l) => l.category, cell: (l) => <Badge tone={l.isHiddenGem ? 'solid' : 'brand'}>{l.category}</Badge> },
  { id: 'visits', header: 'Visits last year', align: 'right', sortValue: (l) => l.visitsLastYear, cell: (l) => <span className="tabular-nums">{l.visitsLastYear.toLocaleString()}</span> },
  { id: 'rating', header: 'Rating', align: 'right', sortValue: (l) => l.rating, cell: (l) => <span className="tabular-nums">{l.rating.toFixed(1)}</span> },
  { id: 'reviews', header: 'Reviews', align: 'right', sortValue: (l) => l.reviewCount, cell: (l) => <span className="tabular-nums">{l.reviewCount.toLocaleString()}</span> },
];

export default function AdminAnalyticsPage() {
  useDocumentTitle('Analytics');
  const [range, setRange] = useState<Range>('12');
  const [view, setView] = useState<View>('visitors');
  const { data, loading, error, reload } = useAsync(async () => {
    const [stats, locations, businesses, bookings] = await Promise.all([getTourismStatistics(), getLocations(), getBusinesses(), getBookings()]);
    return { stats, locations, businesses, bookings };
  });

  const months = Number(range);
  const trend = useMemo(() => data?.stats.monthlyTrend.slice(-months) ?? [], [data, months]);
  const previous = useMemo(() => data?.stats.monthlyTrend.slice(-months * 2, -months) ?? [], [data, months]);
  const byProvince = useMemo(() => {
    const map = new Map<string, number>();
    data?.locations.forEach((l) => l.province.split(' & ').forEach((p) => {
      const key = p.replace(/ Provinces?$/, '');
      map.set(key, (map.get(key) ?? 0) + l.visitsLastYear);
    }));
    return [...map.entries()].map(([name, visits]) => ({ name, visits })).sort((a, b) => b.visits - a.visits);
  }, [data]);
  const byKind = useMemo(() => countBy(data?.businesses ?? [], (b) => listingKindOf(b)), [data]);
  const byDistrict = useMemo(() => countBy(data?.businesses ?? [], (b) => b.district).slice(0, 8), [data]);
  const byBadge = useMemo(() => countBy((data?.businesses ?? []).flatMap((b) => b.badges), (badge) => badge), [data]);
  const bookingMonths = useMemo(() => byMonth(data?.bookings ?? [], (b) => b.createdAt, {
    Confirmed: (b) => +(b.status === 'Confirmed'),
    Pending: (b) => +(b.status === 'Pending'),
    Canceled: (b) => +(b.status === 'Canceled'),
  }), [data]);
  const paidMonths = useMemo(() => byMonth((data?.bookings ?? []).filter((b) => b.payment?.status === 'Paid'), (b) => b.createdAt, { revenue: (b) => b.totalRwf }), [data]);
  const byMethod = useMemo(() => {
    const paid = (data?.bookings ?? []).filter((b) => b.payment?.status === 'Paid');
    return (['mtn', 'airtel', 'card'] as PaymentMethod[]).map((method) => ({
      name: paymentMethodLabel[method],
      value: sum(paid.filter((b) => b.payment?.method === method), (b) => b.totalRwf),
    }));
  }, [data]);

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading || !data) return <Loading />;

  const tot = trend.reduce((s, m) => ({ d: s.d + m.domestic, i: s.i + m.international }), { d: 0, i: 0 });
  const prevTot = previous.reduce((s, m) => s + m.domestic + m.international, 0);
  const total = tot.d + tot.i;
  const peak = trend.reduce((a, m) => (m.domestic + m.international > a.domestic + a.international ? m : a), trend[0] ?? { month: '—', domestic: 0, international: 0 });
  const rangeLabel = `last ${months} months`;
  const businesses = data?.businesses ?? [];
  const bookings = data?.bookings ?? [];
  const paidTotal = sum(bookings.filter((b) => b.payment?.status === 'Paid'), (b) => b.totalRwf);
  const rated = businesses.filter((b) => b.rating > 0);

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-start gap-2">
        <FilterTabs label="Analytics view" value={view} onChange={setView} options={views.map((item) => ({ value: item.value, label: item.label }))} />
        {view === 'visitors' && <FilterTabs label="Time range" value={range} onChange={setRange} options={ranges.map((r) => ({ value: r.value, label: r.label }))} />}
      </div>
      <PageHeader
        title="Tourism analytics"
        intro="Switch between visitor demand, the business catalogue, and how bookings are paid."
      />

      {view === 'visitors' && (
        <>
          <StatGrid>
            <StatCard label="Visitors" icon={Users} value={formatCompact(total)} sparkline={trend.map((m) => m.domestic + m.international)} trend={previous.length === months ? { value: percentChange(total, prevTot), label: 'vs previous period' } : undefined} hint={rangeLabel} />
            <StatCard label="Domestic share" icon={Home} tone="teal" value={total ? `${Math.round((tot.d / total) * 100)}%` : '—'} hint={`${formatCompact(tot.d)} domestic visitors`} />
            <StatCard label="International visitors" icon={Plane} tone="violet" value={formatCompact(tot.i)} sparkline={trend.map((m) => m.international)} hint={rangeLabel} />
            <StatCard label="Peak month" icon={TrendingUp} tone="amber" value={peak.month} hint={`${formatCompact(peak.domestic + peak.international)} visitors`} />
          </StatGrid>
          <div className="mt-6 grid grid-cols-1 gap-6">
                <ChartCard title="Domestic vs international visitors" description={`${total.toLocaleString()} visitors in the ${rangeLabel}`}>
                  <TrendChart data={trend} xKey="month" series={[{ key: 'international', label: 'International' }, { key: 'domestic', label: 'Domestic' }]} axisFormatter={formatCompact} height={320} />
                </ChartCard>
              </div>
              <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
                <ChartCard title="Visits by province" description="Based on visits recorded last year">
                  <BarsChart data={byProvince} xKey="name" layout="vertical" series={[{ key: 'visits', label: 'Visits' }]} axisFormatter={formatCompact} height={260} categoryWidth={90} />
                </ChartCard>
                <ChartCard title="What travellers are looking for" description="Main interest stated by users">
                  <DonutChart data={data.stats.userInterests.map((i) => ({ name: i.name as string, value: i.value }))} valueFormatter={(v) => `${v}%`} height={220} />
                </ChartCard>
              </div>
          <DataTable
            className="mt-6"
            title="Location performance"
            description="All listed locations. Select rows to export a subset."
            data={data?.locations ?? []}
            columns={locationColumns}
            getRowId={(l) => l.id}
            initialSort={{ id: 'visits', desc: true }}
            searchText={(l) => `${l.name} ${l.district} ${l.province} ${l.category}`}
            searchPlaceholder="Search locations"
            exportFileName="location-performance"
          />
        </>
      )}

      {view === 'businesses' && (
        <>
          <StatGrid>
            <StatCard label="Businesses" icon={Building2} value={businesses.length} hint={`${businesses.filter((b) => b.category === 'Accommodation').length} places to stay`} />
            <StatCard label="Kinds" icon={Home} tone="teal" value={byKind.length} hint="Houses, hotels, restaurants and the rest" />
            <StatCard label="Eco-certified" icon={Leaf} tone="violet" value={businesses.filter((b) => b.badges.includes('Eco-certified')).length} />
            <StatCard label="Average rating" icon={TrendingUp} tone="amber" value={rated.length ? average(rated.map((b) => b.rating)).toFixed(2) : '—'} />
          </StatGrid>
          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
              <ChartCard title="Businesses by kind" description="How the catalogue is split" className="xl:col-span-2">
                <BarsChart data={byKind} xKey="name" layout="vertical" series={[{ key: 'value', label: 'Businesses' }]} height={Math.max(220, byKind.length * 36)} categoryWidth={140} />
              </ChartCard>
              <ChartCard title="Where businesses are" description="Top districts by number of branches">
                <BarsChart data={byDistrict} xKey="name" layout="vertical" series={[{ key: 'value', label: 'Businesses' }]} height={280} categoryWidth={120} />
              </ChartCard>
              <ChartCard title="Sustainability badges" description="Branches carrying each badge">
                <DonutChart data={byBadge} centerValue={String(businesses.filter((b) => b.badges.length).length)} centerLabel="badged" height={220} />
              </ChartCard>
            </div>
        </>
      )}

      {view === 'bookings' && (
        <>
          <StatGrid>
            <StatCard label="Bookings" icon={CalendarCheck} value={bookings.length} sparkline={bookingMonths.map((m) => m.Confirmed + m.Pending + m.Canceled)} />
            <StatCard label="Paid value" icon={Wallet} tone="violet" value={formatRwfShort(paidTotal)} sparkline={paidMonths.map((m) => m.revenue)} />
            <StatCard label="Awaiting payment" icon={CalendarCheck} tone="amber" value={bookings.filter((b) => b.status === 'Pending').length} />
            <StatCard label="Canceled" icon={TrendingUp} tone="rose" value={bookings.length ? `${Math.round((bookings.filter((b) => b.status === 'Canceled').length / bookings.length) * 100)}%` : '—'} />
          </StatGrid>
          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
                <ChartCard title="Bookings per month" description="By status" className="xl:col-span-2">
                  <BarsChart data={bookingMonths} xKey="month" stacked series={BOOKING_STATUSES.map((status) => ({ key: status, label: status, color: bookingStatusColor[status] }))} height={280} />
                </ChartCard>
                <ChartCard title="Payments by method" description="Value of paid bookings">
                  <DonutChart data={byMethod} valueFormatter={formatRwfShort} centerValue={formatRwfShort(paidTotal).replace('RWF ', '')} centerLabel="RWF paid" height={200} />
                </ChartCard>
              </div>
              <ChartCard className="mt-6" title="Paid value per month" description="Confirmed payments">
                <TrendChart data={paidMonths} xKey="month" series={[{ key: 'revenue', label: 'Paid' }]} valueFormatter={formatRwfShort} axisFormatter={formatCompact} height={280} />
              </ChartCard>
        </>
      )}
    </>
  );
}
