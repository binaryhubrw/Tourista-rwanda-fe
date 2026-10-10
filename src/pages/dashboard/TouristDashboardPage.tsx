import { Link } from 'react-router-dom';
import { Map, CalendarCheck, Wallet, MessageSquare, Plus, ArrowRight } from 'lucide-react';
import { getBookings, getItineraries, getReviews } from '@/services';
import { useAsync } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useAuth } from '@/context/AuthContext';
import { useFavorites } from '@/context/FavoritesContext';
import { ItineraryCard } from '@/components/cards';
import { ButtonLink, EmptyState, ErrorState, Loading } from '@/components/ui';
import {
  BarsChart, BookingStatusBadge, BOOKING_STATUSES, ChartCard, DonutChart, PageHeader, RankedList, SectionTitle, StatCard, StatGrid, bookingStatusColor,
} from '@/components/dashboard';
import { average, byMonth, countBy, periodTrend, sum } from '@/utils/analytics';
import { formatDate, formatRwf, formatRwfShort, todayIso, formatCompact } from '@/utils/format';

export default function TouristDashboardPage() {
  useDocumentTitle('Dashboard');
  const { user } = useAuth();
  const { favorites } = useFavorites();
  const uid = user!.id;
  const { data, loading, error, reload } = useAsync(async () => {
    const [itineraries, bookings, reviews] = await Promise.all([getItineraries(uid), getBookings({ userId: uid }), getReviews({ userId: uid })]);
    return { itineraries, bookings, reviews };
  }, [uid]);

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading) return <Loading />;

  const itineraries = data?.itineraries ?? [];
  const bookings = data?.bookings ?? [];
  const reviews = data?.reviews ?? [];
  const today = todayIso();

  const active = bookings.filter((b) => b.status !== 'Canceled');
  const upcoming = active.filter((b) => b.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const upcomingTrips = itineraries.filter((i) => i.endDate >= today);
  const spent = sum(active, (b) => b.totalRwf);
  const monthly = byMonth(active, (b) => b.createdAt, { spend: (b) => b.totalRwf, bookings: () => 1 });
  const spendTrend = periodTrend(active, (b) => b.createdAt, (b) => b.totalRwf, 90);
  const statusData = BOOKING_STATUSES.map((s) => ({ name: s, value: bookings.filter((b) => b.status === s).length, color: bookingStatusColor[s] }));
  const byPlace = countBy(active, (b) => b.targetName, (b) => b.totalRwf);
  const favoriteMix = countBy(favorites, (f) => ({ location: 'Destinations', experience: 'Experiences', business: 'Businesses' })[f.itemType]);

  return (
    <>
      <PageHeader
        title={`Muraho, ${user!.name.split(' ')[0]}`}
        intro={upcoming.length ? `Your next booking is ${upcoming[0].targetName} on ${formatDate(upcoming[0].date)}.` : "Here's an overview of your Rwanda travels."}
        action={<ButtonLink to="/itinerary"><Plus className="h-4 w-4" aria-hidden />New itinerary</ButtonLink>}
      />

      <StatGrid>
        <StatCard label="Trips planned" icon={Map} value={itineraries.length} hint={`${upcomingTrips.length} upcoming`} to="/dashboard/itineraries" />
        <StatCard label="Upcoming bookings" icon={CalendarCheck} tone="teal" value={upcoming.length} hint={upcoming[0] ? `Next: ${formatDate(upcoming[0].date)}` : 'Nothing booked yet'} to="/dashboard/bookings" />
        <StatCard label="Total spent" icon={Wallet} tone="violet" value={formatRwfShort(spent)} sparkline={monthly.map((m) => m.spend)} trend={{ value: spendTrend.change, label: 'vs previous 90 days', upIsGood: false }} />
        <StatCard label="Reviews written" icon={MessageSquare} tone="amber" value={reviews.length} hint={reviews.length ? `Average ${average(reviews.map((r) => r.rating)).toFixed(1)} stars given` : 'Share your first review'} to="/dashboard/reviews" />
      </StatGrid>

          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
            <ChartCard title="Spending by month" description="Value of your bookings over the last 12 months (excluding cancellations)" className="xl:col-span-2">
              <BarsChart data={monthly} xKey="month" series={[{ key: 'spend', label: 'Spent' }]} valueFormatter={formatRwf} axisFormatter={formatCompact} />
            </ChartCard>
            <ChartCard title="Bookings by status" description={`${bookings.length} bookings in total`}>
              <DonutChart data={statusData} centerValue={String(bookings.length)} centerLabel="bookings" height={200} />
            </ChartCard>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
            <ChartCard title="Where your money went" description="Top places by amount booked">
              <RankedList data={byPlace} valueFormatter={formatRwfShort} max={5} />
            </ChartCard>
            <ChartCard title="Saved favorites" description="What you've saved while exploring" footer={<Link to="/dashboard/favorites" className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:underline">See favorites<ArrowRight className="h-4 w-4" aria-hidden /></Link>}>
              {favoriteMix.length ? <DonutChart data={favoriteMix} centerValue={String(favorites.length)} centerLabel="saved" height={180} /> : <p className="py-10 text-center text-sm text-slate-500">Tap the heart on any place to save it.</p>}
            </ChartCard>
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <SectionTitle title="Coming up" action={<Link to="/dashboard/bookings" className="text-sm font-semibold text-brand-600 hover:underline">All bookings</Link>} />
              {!upcoming.length ? (
                <p className="py-10 text-center text-sm text-slate-500">No upcoming bookings.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {upcoming.slice(0, 5).map((b) => (
                    <li key={b.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-center font-display leading-none text-brand-600">
                        <span><span className="block text-base font-bold">{formatDate(b.date, { day: 'numeric' })}</span><span className="text-[10px] font-semibold uppercase">{formatDate(b.date, { month: 'short' })}</span></span>
                      </div>
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-ink">{b.targetName}</p><p className="text-xs text-slate-500">{b.people} {b.people > 1 ? 'guests' : 'guest'} · {formatRwf(b.totalRwf)}</p></div>
                      <BookingStatusBadge status={b.status} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section className="mt-6">
            <SectionTitle title="Recent itineraries" action={<Link to="/dashboard/itineraries" className="text-sm font-semibold text-brand-600 hover:underline">See all</Link>} />
            {!itineraries.length ? (
              <EmptyState title="No trips planned yet" message="Pick destinations and arrange them day by day." action={<ButtonLink to="/itinerary" size="sm">Build an itinerary</ButtonLink>} />
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">{itineraries.slice(0, 2).map((i) => <ItineraryCard key={i.id} itinerary={i} />)}</div>
            )}
          </section>
    </>
  );
}
