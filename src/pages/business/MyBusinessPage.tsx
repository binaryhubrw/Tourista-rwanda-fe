import { Link } from 'react-router-dom';
import { Plus, Pencil, Store, Package, Star, Leaf, BedDouble, UtensilsCrossed, Sparkles, CalendarCheck } from 'lucide-react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { DataTable, PageHeader, StatCard, StatGrid, type Column } from '@/components/dashboard';
import { Badge, ButtonLink, EmptyState, ErrorState, Loading } from '@/components/ui';
import { formatRwf } from '@/utils/format';
import { fromPrice, isRoom } from '@/utils/pricing';
import { listingKindOf } from '@/utils/catalog';
import { ListingViewLink } from '../shared/tableColumns';
import { useOwnerActivity } from './useOwnerBusinesses';
import type { Booking, Business } from '@/types';

const countFor = (bookings: Booking[], id: string) => bookings.filter((item) => item.businessId === id || item.targetId === id).length;

const columns = (bookings: Booking[]): Column<Business>[] => [
  { id: 'name', header: 'Listing', sortValue: (b) => b.name, cell: (b) => (
    <div className="min-w-0">
      <Link to={`/business-dashboard/business/${b.id}`} className="font-semibold text-ink hover:text-brand-700 hover:underline">{b.name}</Link>
      <p className="text-xs text-slate-500">{b.district}</p>
    </div>
  ) },
  { id: 'kind', header: 'Kind', sortValue: (b) => listingKindOf(b), cell: (b) => <Badge tone="solid">{listingKindOf(b)}</Badge> },
  { id: 'rooms', header: 'Rooms', align: 'right', sortValue: (b) => b.services.filter(isRoom).reduce((n, r) => n + (r.available ?? 1), 0), cell: (b) => <span className="tabular-nums">{b.services.filter(isRoom).reduce((n, r) => n + (r.available ?? 1), 0)}</span> },
  { id: 'wellness', header: 'Services', align: 'right', sortValue: (b) => b.services.filter((s) => s.group === 'wellness').length, cell: (b) => <span className="tabular-nums">{b.services.filter((s) => s.group === 'wellness').length}</span> },
  { id: 'food', header: 'Food', align: 'right', sortValue: (b) => b.services.filter((s) => s.group === 'food').length, cell: (b) => <span className="tabular-nums">{b.services.filter((s) => s.group === 'food').length}</span> },
  { id: 'bookings', header: 'Bookings', align: 'right', sortValue: (b) => countFor(bookings, b.id), cell: (b) => <span className="tabular-nums">{countFor(bookings, b.id)}</span> },
  { id: 'from', header: 'From', align: 'right', sortValue: (b) => fromPrice(b)?.priceRwf ?? 0, cell: (b) => { const p = fromPrice(b); return p ? <span className="whitespace-nowrap tabular-nums">{formatRwf(p.priceRwf)}</span> : '—'; } },
  { id: 'rating', header: 'Rating', align: 'right', sortValue: (b) => b.rating, cell: (b) => <span className="tabular-nums">{b.rating ? b.rating.toFixed(1) : 'New'}</span> },
];

export default function MyBusinessPage() {
  useDocumentTitle('Listings');
  const { data, loading, error, reload } = useOwnerActivity();

  if (loading) return <Loading label="Loading listings" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const list = data?.businesses ?? [];
  const bookings = data?.bookings ?? [];
  const rated = list.filter((b) => b.rating > 0);
  const rooms = list.reduce((n, b) => n + b.services.filter(isRoom).reduce((s, r) => s + (r.available ?? 1), 0), 0);
  const wellness = list.reduce((n, b) => n + b.services.filter((s) => s.group === 'wellness').length, 0);
  const food = list.reduce((n, b) => n + b.services.filter((s) => s.group === 'food').length, 0);

  return (
    <>
      <PageHeader title="Listings" intro="Every listing you have on Tourista Rwanda, with a count of rooms, services and food." action={<ButtonLink to="/business-dashboard/business/new"><Plus className="h-4 w-4" aria-hidden />Add listing</ButtonLink>} />
      <StatGrid className="mb-6 grid-cols-2">
        <StatCard label="Listings" icon={Store} value={list.length} hint={list.map((b) => listingKindOf(b)).filter((c, i, a) => a.indexOf(c) === i).join(', ') || 'No listings yet'} />
        <StatCard label="Rooms" icon={BedDouble} tone="teal" value={rooms} />
        <StatCard label="Wellness services" icon={Sparkles} tone="violet" value={wellness} />
        <StatCard label="Food & drink" icon={UtensilsCrossed} tone="amber" value={food} />
      </StatGrid>
      <StatGrid className="mb-6 grid-cols-2">
        <StatCard label="Bookings" icon={CalendarCheck} tone="teal" value={bookings.length} hint="Across all listings" to="/business-dashboard/bookings" />
        <StatCard label="All offerings" icon={Package} value={list.reduce((s, b) => s + b.services.length, 0)} to="/business-dashboard/services" />
        <StatCard label="Average rating" icon={Star} tone="amber" value={rated.length ? (rated.reduce((s, b) => s + b.rating, 0) / rated.length).toFixed(1) : 'New'} hint={`${list.reduce((s, b) => s + b.reviewCount, 0)} reviews`} to="/business-dashboard/reviews" />
        <StatCard label="Sustainability badges" icon={Leaf} tone="violet" value={new Set(list.flatMap((b) => b.badges)).size} />
      </StatGrid>
      {!list.length ? (
        <EmptyState title="No listings yet" message="Add your first listing so travellers can find and book you." action={<ButtonLink to="/business-dashboard/business/new">Add listing</ButtonLink>} />
      ) : (
        <DataTable
          data={list}
          columns={columns(bookings)}
          getRowId={(b) => b.id}
          initialSort={{ id: 'name', desc: false }}
          searchText={(b) => `${b.name} ${listingKindOf(b)} ${b.district}`}
          searchPlaceholder="Search listings"
          exportFileName="my-listings"
          rowActions={(b) => (
            <div className="flex items-center justify-end gap-1">
              <ListingViewLink to={`/business-dashboard/business/${b.id}`} name={b.name} />
              <ButtonLink to={`/business-dashboard/business/${b.id}/edit`} size="sm" variant="secondary"><Pencil className="h-4 w-4" aria-hidden />Edit</ButtonLink>
            </div>
          )}
        />
      )}
    </>
  );
}
