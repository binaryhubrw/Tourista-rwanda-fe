import { Link } from 'react-router-dom';
import { Store, CalendarCheck, Star, Plus, Wallet, Clock, ArrowRight } from 'lucide-react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useAuth } from '@/context/AuthContext';
import { Badge, ButtonLink, EmptyState, ErrorState, Rating, Skeleton, SmartImage } from '@/components/ui';
import {
  BarsChart, BookingStatusBadge, BOOKING_STATUSES, ChartCard, DonutChart, PageHeader, RankedList, SectionTitle, StatCard, StatGrid, TrendChart, bookingStatusColor,
} from '@/components/dashboard';
import { average, byMonth, countBy, periodTrend, sum } from '@/utils/analytics';
import { formatDate, formatRwf, formatRwfShort, formatCompact } from '@/utils/format';
import { useOwnerActivity } from './useOwnerBusinesses';

export default function BusinessDashboardPage() {
  useDocumentTitle('Business dashboard');
  const { user } = useAuth();
  const { data, loading, error, reload } = useOwnerActivity();
  const firstName = user!.name.split(' ')[0];

  if (error) return <ErrorState message={error} onRetry={reload} />;

  if (!loading && !data?.businesses.length) {
    return (
      <>
        <PageHeader title={`Welcome, ${firstName}`} intro={user!.businessName ? `${user!.businessName} has no listings yet. Add one so travellers can book you.` : 'Add a listing so travellers can find and book you.'} />
        <StatGrid>
          <StatCard label="Listings" icon={Store} value={0} hint="Add your first listing" />
          <StatCard label="Bookings" icon={CalendarCheck} tone="teal" value={0} />
          <StatCard label="Revenue" icon={Wallet} tone="violet" value={formatRwfShort(0)} />
          <StatCard label="Rating" icon={Star} tone="amber" value="New" />
        </StatGrid>
        <div className="mt-6">
          <EmptyState icon={<Store className="h-7 w-7" />} title="You haven't listed anything yet" message="Add a stay, restaurant, guide, workshop or product. The form asks only for what that kind of listing needs." action={<ButtonLink to="/business-dashboard/business/new"><Plus className="h-4 w-4" aria-hidden />Add listing</ButtonLink>} />
        </div>
      </>
    );
  }

  const businesses = data?.businesses ?? [];
  const bookings = data?.bookings ?? [];
  const reviews = data?.reviews ?? [];
  const confirmed = bookings.filter((b) => b.status === 'Confirmed');
  const pending = bookings.filter((b) => b.status === 'Pending');

  const revenueTrend = periodTrend(confirmed, (b) => b.createdAt, (b) => b.totalRwf, 30);
  const bookingTrend = periodTrend(bookings, (b) => b.createdAt, () => 1, 30);
  const monthly = byMonth(confirmed, (b) => b.createdAt, { revenue: (b) => b.totalRwf, guests: (b) => b.people });
  const monthlyBookings = byMonth(bookings, (b) => b.createdAt, { bookings: () => 1 });
  const statusData = BOOKING_STATUSES.map((s) => ({ name: s, value: bookings.filter((b) => b.status === s).length, color: bookingStatusColor[s] }));
  const byService = countBy(confirmed, (b) => b.serviceName ?? b.targetName, (b) => b.totalRwf);
  const byListing = businesses
    .map((listing) => ({
      name: listing.name,
      revenue: sum(confirmed.filter((b) => b.businessId === listing.id || b.targetId === listing.id), (b) => b.totalRwf),
    }))
    .sort((a, b) => b.revenue - a.revenue);
  const avgRating = reviews.length ? average(reviews.map((r) => r.rating)) : 0;
  const ratingDist = [5, 4, 3, 2, 1].map((n) => ({ stars: `${n} star${n > 1 ? 's' : ''}`, reviews: reviews.filter((r) => r.rating === n).length }));
  const main = businesses[0];

  return (
    <>
      <PageHeader
        title={`Welcome, ${firstName}`}
        intro={loading ? 'Loading your business…' : `${user!.businessName ? `${user!.businessName} · ` : ''}${businesses.length} listing${businesses.length === 1 ? '' : 's'}.${pending.length ? ` ${pending.length} booking${pending.length > 1 ? 's are' : ' is'} waiting for the guest's payment.` : ' Every booking is paid and confirmed.'}`}
        action={<ButtonLink to="/business-dashboard/bookings">Review bookings</ButtonLink>}
      />

      <StatGrid>
        <StatCard label="Revenue (30 days)" icon={Wallet} loading={loading} value={formatRwfShort(revenueTrend.current)} sparkline={monthly.map((m) => m.revenue)} trend={{ value: revenueTrend.change, label: 'vs previous 30 days' }} />
        <StatCard label="New bookings (30 days)" icon={CalendarCheck} tone="teal" loading={loading} value={bookingTrend.current} sparkline={monthlyBookings.map((m) => m.bookings)} trend={{ value: bookingTrend.change, label: 'vs previous 30 days' }} to="/business-dashboard/bookings" />
        <StatCard label="Awaiting payment" icon={Clock} tone="amber" loading={loading} value={pending.length} hint={pending.length ? 'Confirmed automatically once paid' : 'Nothing waiting'} to="/business-dashboard/bookings" />
        <StatCard label="Average rating" icon={Star} tone="violet" loading={loading} value={avgRating ? avgRating.toFixed(1) : 'New'} hint={`${reviews.length} review${reviews.length === 1 ? '' : 's'}`} to="/business-dashboard/reviews" />
      </StatGrid>

      {loading ? (
        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3"><Skeleton className="h-80 xl:col-span-2" /><Skeleton className="h-80" /></div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
            <ChartCard title="Revenue" description={`Confirmed bookings, last 12 months · ${formatRwf(sum(confirmed, (b) => b.totalRwf))} in total`} className="xl:col-span-2">
              <TrendChart data={monthly} xKey="month" series={[{ key: 'revenue', label: 'Revenue' }]} valueFormatter={formatRwf} axisFormatter={formatCompact} height={300} />
            </ChartCard>
            <ChartCard title="Bookings by status" description="All requests received">
              <DonutChart data={statusData} centerValue={String(bookings.length)} centerLabel="bookings" height={200} />
            </ChartCard>
          </div>

          <ChartCard className="mt-6" title="Revenue per listing" description={`Confirmed bookings · ${formatRwf(sum(confirmed, (b) => b.totalRwf))} in total`}>
            {byListing.length ? (
              <BarsChart
                data={byListing}
                xKey="name"
                layout="vertical"
                series={[{ key: 'revenue', label: 'Revenue' }]}
                valueFormatter={formatRwf}
                axisFormatter={formatRwfShort}
                height={Math.max(220, byListing.length * 56)}
                categoryWidth={160}
              />
            ) : (
              <p className="py-10 text-center text-sm text-slate-500">Revenue will split across listings once travellers book.</p>
            )}
          </ChartCard>

          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
            <ChartCard title="Guests per month" description="People on confirmed bookings">
              <BarsChart data={monthly} xKey="month" series={[{ key: 'guests', label: 'Guests' }]} height={240} />
            </ChartCard>
            <ChartCard title="Revenue by service" description="Which services earn the most">
              <RankedList data={byService} valueFormatter={formatRwfShort} max={5} />
            </ChartCard>
            <ChartCard title="Rating breakdown" description={`${reviews.length} reviews · average ${avgRating ? avgRating.toFixed(1) : '—'}`}>
              <BarsChart data={ratingDist} xKey="stars" layout="vertical" series={[{ key: 'reviews', label: 'Reviews' }]} height={220} categoryWidth={64} />
            </ChartCard>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <SectionTitle title="Latest bookings" action={<Link to="/business-dashboard/bookings" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline">All bookings<ArrowRight className="h-4 w-4" aria-hidden /></Link>} />
              {!bookings.length ? <p className="py-10 text-center text-sm text-slate-500">Bookings from travellers will appear here.</p> : (
                <ul className="divide-y divide-slate-100">
                  {bookings.slice(0, 6).map((b) => (
                    <li key={b.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-ink">{b.customerName}</p>
                        <p className="truncate text-sm text-slate-500">{b.serviceName} · {formatDate(b.date)} · {b.people} {b.people > 1 ? 'guests' : 'guest'}</p>
                      </div>
                      <span className="hidden whitespace-nowrap text-sm font-semibold tabular-nums text-ink sm:block">{formatRwf(b.totalRwf)}</span>
                      <BookingStatusBadge status={b.status} />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white" aria-label="Business profile">
              <SmartImage src={main.image} alt={main.name} className="aspect-[16/7] w-full" />
              <div className="flex-1 p-5">
                <div className="flex flex-wrap gap-1.5"><Badge tone="solid">{main.category}</Badge>{main.badges.map((b) => <Badge key={b}>{b}</Badge>)}</div>
                <h2 className="mt-2 font-display text-xl font-bold text-ink">{main.name}</h2>
                <p className="text-sm text-slate-500">{main.district}</p>
                <Rating value={main.rating} count={main.reviewCount} className="mt-1 text-sm" />
                <div className="mt-4 flex flex-wrap gap-2">
                  <ButtonLink to={`/business-dashboard/business/${main.id}/edit`} size="sm">Edit listing</ButtonLink>
                  <ButtonLink to={`/businesses/${main.id}`} size="sm" variant="secondary">View public page</ButtonLink>
                </div>
              </div>
            </section>
          </div>
        </>
      )}
    </>
  );
}
