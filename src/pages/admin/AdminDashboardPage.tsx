import { Link } from 'react-router-dom';
import { Users, MapPin, Store, CalendarCheck, AlertTriangle, ArrowRight, Wallet, Briefcase, HeartHandshake, Sprout } from 'lucide-react';
import { getBookings, getTourismStatistics, getUsers } from '@/services';
import { useAsync } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Avatar, ButtonLink, ErrorState, Skeleton } from '@/components/ui';
import { AddNewMenu, BarsChart, ChartCard, DonutChart, PageHeader, RankedList, SectionTitle, StatCard, StatGrid, TrendChart, roleLabel } from '@/components/dashboard';
import { ADMIN_ADD_NEW } from './addNewItems';
import { byMonth, percentChange, periodTrend } from '@/utils/analytics';
import { formatCompact, formatDate, formatRwfShort } from '@/utils/format';

export default function AdminDashboardPage() {
  useDocumentTitle('Admin dashboard');
  const { data, loading, error, reload } = useAsync(async () => {
    const [stats, bookings, users] = await Promise.all([getTourismStatistics(), getBookings(), getUsers()]);
    return { stats, bookings, users };
  });

  if (error) return <ErrorState message={error} onRetry={reload} />;

  const stats = data?.stats;
  const t = stats?.totals;
  const trend = stats?.monthlyTrend ?? [];
  const visitors = trend.map((m) => m.domestic + m.international);
  const lastMonth = visitors.at(-1) ?? 0;
  const prevMonth = visitors.at(-2) ?? 0;
  const bookings = data?.bookings ?? [];
  const bookingTrend = periodTrend(bookings, (b) => b.createdAt, () => 1, 30);
  const monthlyBookings = byMonth(bookings, (b) => b.createdAt, { bookings: () => 1 });
  const signups = periodTrend(data?.users ?? [], (u) => u.joinedAt, () => 1, 90);
  const busiest = stats?.highTrafficLocations.reduce((a, b) => (b.visitsPerDay / b.capacity > a.visitsPerDay / a.capacity ? b : a));
  const impact = stats?.economicImpact;
  const interestSlices = (stats?.userInterests ?? []).map((i) => ({ name: i.name as string, value: i.value }));

  return (
    <>
      <PageHeader title="Tourism overview" intro="Platform activity across Rwanda over the last 12 months." action={<><ButtonLink to="/admin/analytics" variant="secondary">Detailed analytics</ButtonLink><AddNewMenu items={ADMIN_ADD_NEW} /></>} />

      <StatGrid>
        <StatCard label="Visitors this month" icon={Users} loading={loading} value={formatCompact(lastMonth)} sparkline={visitors} trend={{ value: percentChange(lastMonth, prevMonth), label: 'vs last month' }} hint={t && `${formatCompact(t.tourists)} registered tourists`} />
        <StatCard label="Bookings (30 days)" icon={CalendarCheck} tone="teal" loading={loading} value={bookingTrend.current} sparkline={monthlyBookings.map((m) => m.bookings)} trend={{ value: bookingTrend.change, label: 'vs previous 30 days' }} to="/admin/bookings" />
        <StatCard label="Listed businesses" icon={Store} tone="violet" loading={loading} value={t?.businesses} hint={impact && `${impact.womenLedBusinesses} women-led nationwide`} to="/admin/businesses" />
        <StatCard label="Destinations" icon={MapPin} tone="amber" loading={loading} value={t?.locations} hint={t && `${formatCompact(t.reviews)} reviews written`} to="/admin/locations" />
      </StatGrid>

      {loading || !stats ? (
        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3"><Skeleton className="h-80 xl:col-span-2" /><Skeleton className="h-80" /></div>
      ) : (
        <>
          {busiest && (
            <p role="status" className="mt-6 flex items-start gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-5 py-3 text-sm text-ink">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden />
              <span><strong>{busiest.name}</strong> is running at {Math.round((busiest.visitsPerDay / busiest.capacity) * 100)}% of comfortable capacity. Consider promoting nearby hidden gems to spread visitors.</span>
            </p>
          )}

          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
            <ChartCard title="Visitor trend" description="Monthly visitors using the platform" className="xl:col-span-2">
              <TrendChart data={trend} xKey="month" series={[{ key: 'international', label: 'International' }, { key: 'domestic', label: 'Domestic' }]} axisFormatter={formatCompact} height={300} />
            </ChartCard>
            <ChartCard title="Traveller interests" description="Share of travellers by main interest">
              <DonutChart data={interestSlices} valueFormatter={(v) => `${v}%`} height={200} />
            </ChartCard>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
            <ChartCard title="Most visited destinations" description="Visits recorded last year">
              <BarsChart data={stats.popularLocations} xKey="name" layout="vertical" series={[{ key: 'visits', label: 'Visits' }]} axisFormatter={formatCompact} height={300} categoryWidth={140} />
            </ChartCard>
            <ChartCard title="Crowding at hotspots" description="Average daily visitors against comfortable capacity">
              <BarsChart data={stats.highTrafficLocations} xKey="name" layout="vertical" series={[{ key: 'visitsPerDay', label: 'Visitors per day' }, { key: 'capacity', label: 'Comfortable capacity', color: '#CCE4EE' }]} height={300} categoryWidth={140} />
            </ChartCard>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
            <ChartCard title="Local economic impact" description="Value reaching local businesses and communities" className="xl:col-span-2">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
                <dl className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Revenue to local businesses', value: formatRwfShort(impact!.localRevenueRwf), icon: Wallet },
                    { label: 'Jobs supported', value: impact!.jobsSupported.toLocaleString(), icon: Briefcase },
                    { label: 'Women-led businesses', value: impact!.womenLedBusinesses.toLocaleString(), icon: HeartHandshake },
                    { label: 'Community projects', value: impact!.communityProjects.toLocaleString(), icon: Sprout },
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="rounded-xl bg-slate-50 p-4">
                      <Icon className="h-4 w-4 text-brand-600" aria-hidden />
                      <dd className="mt-2 font-display text-xl font-bold text-ink">{value}</dd>
                      <dt className="text-xs text-slate-500">{label}</dt>
                    </div>
                  ))}
                </dl>
                <RankedList data={impact!.revenueByCategory.map((c) => ({ name: c.category, value: c.revenueRwf }))} valueFormatter={formatRwfShort} max={7} />
              </div>
            </ChartCard>

            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <SectionTitle title="New members" action={<Link to="/admin/users" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline">All users<ArrowRight className="h-4 w-4" aria-hidden /></Link>} />
              <p className="-mt-2 mb-3 text-sm text-slate-500">{signups.current} joined in the last 90 days</p>
              <ul className="divide-y divide-slate-100">
                {(data?.users ?? []).slice(0, 6).map((u) => (
                  <li key={u.id} className="flex items-center gap-3 py-2.5">
                    <Avatar name={u.name} size={34} />
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-ink">{u.name}</p><p className="text-xs text-slate-500">{roleLabel[u.role]} · {u.country ?? '—'}</p></div>
                    <span className="whitespace-nowrap text-xs text-slate-500">{formatDate(u.joinedAt, { day: 'numeric', month: 'short' })}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      )}
    </>
  );
}
