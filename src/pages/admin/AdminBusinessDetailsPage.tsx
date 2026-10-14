import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Phone, Mail, MapPin, BedDouble, Sparkles, UtensilsCrossed, Package, CalendarCheck, Wallet, Star, Car } from 'lucide-react';
import { getBookings, getBusinessById, getBusinessesByOwner, getReviews, getUserById } from '@/services';
import { useAsync } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Badge, ButtonLink, ErrorState, Loading, Rating, SmartImage, spanLabel } from '@/components/ui';
import { DataTable, FilterTabs, ListingApprovalBadge, PageHeader, StatCard, VehicleCategoryBadge, type Column } from '@/components/dashboard';
import { ListingReviewActions } from '@/components/business/ListingReviewActions';
import { listingApproval } from '@/utils/approval';
import { BookingViewLink, ListingViewLink, bookingColumns, bookingSearchText, reviewColumns, reviewSearchText } from '../shared/tableColumns';
import { formatRwf } from '@/utils/format';
import { fromPrice, isRoom } from '@/utils/pricing';
import { fleetCount, listingKindOf, vehicleCarry, vehicleLevelPhoto, vehicleUnits } from '@/utils/catalog';
import { bookingsForListing, subscriptionsPaid } from '@/utils/lifecycle';
import { roomStatus } from '@/utils/availability';
import { cn } from '@/utils/cn';
import type { Booking, Business, Service } from '@/types';

type View = 'overview' | 'listings' | 'rooms' | 'services' | 'vehicles' | 'bookings' | 'reviews';
type OfferRow = { listing: Business; service: Service };
type VehicleRow = OfferRow & { plate: string; image: string; level: string };

const offerName = (s: Service) => (s.category && s.category !== s.name ? `${s.category} · ${s.name}` : s.name);
const rowId = (row: OfferRow) => `${row.listing.id}:${row.service.id}`;

const listingColumns = (bookings: Booking[]): Column<Business>[] => [
  { id: 'name', header: 'Branch', sortValue: (b) => b.name, cell: (b) => (
    <div className="min-w-0">
      <Link to={`/admin/businesses/${b.id}/branch`} className="font-semibold text-ink hover:text-brand-700 hover:underline">{b.name}</Link>
      <p className="text-xs text-slate-500">{b.district}</p>
    </div>
  ) },
  { id: 'kind', header: 'Kind', sortValue: (b) => listingKindOf(b), cell: (b) => <Badge tone="solid">{listingKindOf(b)}</Badge> },
  { id: 'review', header: 'Review', sortValue: (b) => listingApproval(b), cell: (b) => <ListingApprovalBadge status={listingApproval(b)} /> },
  { id: 'rooms', header: 'Rooms', align: 'right', sortValue: (b) => b.services.filter(isRoom).length, cell: (b) => <span className="tabular-nums">{b.services.filter(isRoom).length}</span> },
  { id: 'services', header: 'Services', align: 'right', sortValue: (b) => b.services.filter((s) => !isRoom(s) && s.group !== 'vehicle').length, cell: (b) => <span className="tabular-nums">{b.services.filter((s) => !isRoom(s) && s.group !== 'vehicle').length}</span> },
  { id: 'vehicles', header: 'Vehicles', align: 'right', sortValue: (b) => fleetCount(b.services), cell: (b) => <span className="tabular-nums">{fleetCount(b.services)}</span> },
  { id: 'bookings', header: 'Bookings', align: 'right', sortValue: (b) => bookingsForListing(bookings, b.id).length, cell: (b) => <span className="tabular-nums">{bookingsForListing(bookings, b.id).length}</span> },
  { id: 'fees', header: 'Subscriptions', align: 'right', sortValue: (b) => subscriptionsPaid(bookingsForListing(bookings, b.id)), cell: (b) => <span className="tabular-nums">{formatRwf(subscriptionsPaid(bookingsForListing(bookings, b.id)))}</span> },
  { id: 'from', header: 'From', align: 'right', sortValue: (b) => fromPrice(b)?.priceRwf ?? 0, cell: (b) => { const p = fromPrice(b); return p ? <span className="tabular-nums">{formatRwf(p.priceRwf)}</span> : '—'; } },
  { id: 'rating', header: 'Rating', align: 'right', sortValue: (b) => b.rating, cell: (b) => <span className="tabular-nums">{b.rating ? b.rating.toFixed(1) : 'New'}</span> },
];

const roomColumns = (bookings: Booking[]): Column<OfferRow>[] => [
  { id: 'listing', header: 'Branch', sortValue: (r) => r.listing.name, cell: (r) => <Link to={`/admin/businesses/${r.listing.id}`} className="font-semibold hover:underline">{r.listing.name}</Link> },
  { id: 'name', header: 'Room', sortValue: (r) => r.service.name, cell: (r) => (
    <div className="min-w-0">
      <p className="font-semibold text-ink">{offerName(r.service)}</p>
      {r.service.description && <p className="text-xs text-slate-500">{r.service.description}</p>}
    </div>
  ) },
  { id: 'rooms', header: 'Rooms', align: 'right', sortValue: (r) => r.service.available ?? 0, cell: (r) => <span className="tabular-nums">{r.service.available ?? '—'}</span> },
  { id: 'beds', header: 'Beds', align: 'right', sortValue: (r) => r.service.available ?? 0, cell: (r) => <span className="tabular-nums">{r.service.available ?? 1}</span> },
  { id: 'status', header: 'Status', sortValue: (r) => roomStatus(r.service, bookings).label, cell: (r) => {
    const status = roomStatus(r.service, bookings);
    return <Badge tone={status.tone}>{status.label}</Badge>;
  } },
  { id: 'dates', header: 'Booked dates', cell: (r) => {
    const { spans } = roomStatus(r.service, bookings);
    if (!spans.length) return <span className="text-slate-500">Available</span>;
    return (
      <ul className="max-w-[220px] space-y-0.5 text-xs text-slate-700">
        {spans.slice(0, 4).map((span) => (
          <li key={`${span.start}-${span.end}`}>{spanLabel(span.start, span.end)}{span.units > 1 ? ` · ${span.units}` : ''}</li>
        ))}
        {spans.length > 4 && <li className="text-slate-500">+{spans.length - 4} more</li>}
      </ul>
    );
  } },
  { id: 'price', header: 'Per night', align: 'right', sortValue: (r) => r.service.priceRwf, cell: (r) => <span className="tabular-nums">{formatRwf(r.service.priceRwf)}</span> },
];

const serviceColumns: Column<OfferRow>[] = [
  { id: 'listing', header: 'Branch', sortValue: (r) => r.listing.name, cell: (r) => <Link to={`/admin/businesses/${r.listing.id}`} className="font-semibold hover:underline">{r.listing.name}</Link> },
  { id: 'name', header: 'Service', sortValue: (r) => r.service.name, cell: (r) => (
    <div className="min-w-0">
      <p className="font-semibold text-ink">{offerName(r.service)}</p>
      <p className="text-xs text-slate-500">{r.service.group === 'wellness' ? 'Wellness' : r.service.group === 'food' ? 'Food & drink' : 'Other'}</p>
    </div>
  ) },
  { id: 'unit', header: 'Charged', sortValue: (r) => r.service.unit, cell: (r) => r.service.unit },
  { id: 'price', header: 'Price', align: 'right', sortValue: (r) => r.service.priceRwf, cell: (r) => <span className="tabular-nums">{formatRwf(r.service.priceRwf)}</span> },
  { id: 'available', header: 'Capacity', align: 'right', sortValue: (r) => r.service.available ?? 0, cell: (r) => <span className="tabular-nums">{r.service.available ?? '—'}</span> },
];

const vehicleColumns: Column<VehicleRow>[] = [
  { id: 'listing', header: 'Branch', sortValue: (r) => r.listing.name, cell: (r) => <Link to={`/admin/businesses/${r.listing.id}`} className="font-semibold hover:underline">{r.listing.name}</Link> },
  {
    id: 'name', header: 'Vehicle', sortValue: (r) => r.service.name,
    cell: (r) => (
      <div className="flex min-w-[240px] items-center gap-3">
        <SmartImage src={r.image} alt="" className="h-14 w-20 shrink-0 rounded-xl" />
        <div className="min-w-0">
          <p className="font-semibold text-ink">{r.service.brand ? `${r.service.brand} · ${r.service.name}` : offerName(r.service)}</p>
          <p className="line-clamp-1 text-xs text-slate-500">{vehicleCarry(r.service).label}</p>
        </div>
      </div>
    ),
  },
  { id: 'category', header: 'Category', sortValue: (r) => r.level, cell: (r) => <VehicleCategoryBadge category={r.level} /> },
  { id: 'plate', header: 'Plate', sortValue: (r) => r.plate, cell: (r) => <span className="whitespace-nowrap font-semibold tabular-nums tracking-wide">{r.plate || '—'}</span> },
  { id: 'seats', header: 'Seats', align: 'right', sortValue: (r) => r.service.capacity ?? 0, cell: (r) => <span className="tabular-nums">{vehicleCarry(r.service).peopleLabel}</span> },
  { id: 'price', header: 'Per day', align: 'right', sortValue: (r) => r.service.priceRwf, cell: (r) => <span className="tabular-nums">{formatRwf(r.service.priceRwf)}</span> },
];

export default function AdminBusinessDetailsPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [view, setView] = useState<View>('overview');
  const [photo, setPhoto] = useState(0);
  const { data, loading, error, reload, setData } = useAsync(async () => {
    const listing = await getBusinessById(id);
    const listings = listing.ownerId ? await getBusinessesByOwner(listing.ownerId) : [listing];
    const ids = listings.map((item) => item.id);
    const [bookings, reviewLists, owner] = await Promise.all([
      getBookings({ businessIds: ids }),
      Promise.all(ids.map((listingId) => getReviews({ targetId: listingId }))),
      listing.ownerId ? getUserById(listing.ownerId).catch(() => null) : Promise.resolve(null),
    ]);
    return { listing, listings, bookings, reviews: reviewLists.flat(), owner };
  }, [id]);
  useDocumentTitle(data ? data.listing.name : 'Business');
  useEffect(() => { setPhoto(0); setView('overview'); }, [id]);

  if (loading) return <Loading label="Loading business" />;
  if (error || !data) return <ErrorState message={error ?? 'That business was not found.'} onRetry={error ? reload : () => navigate('/admin/businesses')} />;

  const { listing, listings, bookings, reviews, owner } = data;
  const kind = listingKindOf(listing);
  const rooms = listings.flatMap((item) => item.services.filter(isRoom).map((service) => ({ listing: item, service })));
  const services = listings.flatMap((item) => item.services.filter((s) => !isRoom(s) && s.group !== 'vehicle').map((service) => ({ listing: item, service })));
  const vehicleRows: VehicleRow[] = listings.flatMap((item) =>
    item.services.filter((s) => s.group === 'vehicle').flatMap((service) => {
      const units = vehicleUnits(service);
      if (!units.length) {
        return [{ listing: item, service, plate: '', image: vehicleLevelPhoto(service.category), level: service.category || 'Standard' }];
      }
      return units.map((unit) => ({
        listing: item,
        service,
        plate: unit.plate,
        image: unit.image || vehicleLevelPhoto(unit.level || service.category),
        level: unit.level || service.category || 'Standard',
      }));
    }),
  );
  const confirmed = bookings.filter((b) => b.status === 'Confirmed');
  const revenue = confirmed.reduce((sum, b) => sum + b.totalRwf, 0);
  const photos = [listing.image, ...(listing.gallery ?? [])].filter((src, i, all) => src && all.indexOf(src) === i);

  return (
    <>
      <ButtonLink to="/admin/businesses" variant="ghost" className="mb-3 -ml-2 w-fit"><ChevronLeft className="h-4 w-4" aria-hidden />All businesses</ButtonLink>
      <PageHeader
        title={owner?.businessName || listing.ownerName || listing.name}
        intro={`${listings.length} branch${listings.length === 1 ? '' : 'es'} · currently ${listing.name} (${kind}) in ${listing.district}.`}
        action={<ListingReviewActions listing={listing} onUpdated={(next) => setData((d) => d && { ...d, listing: next, listings: d.listings.map((item) => item.id === next.id ? next : item) })} />}
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Branches" icon={Package} value={listings.length} hint={listings.map((item) => listingKindOf(item)).filter((item, i, all) => all.indexOf(item) === i).join(', ')} />
        <StatCard label="Rooms" icon={BedDouble} tone="teal" value={rooms.reduce((n, r) => n + (r.service.available ?? 1), 0)} />
        <StatCard label="Services" icon={Sparkles} tone="violet" value={services.length} />
        <StatCard label="Food & drink" icon={UtensilsCrossed} tone="amber" value={listings.reduce((n, item) => n + item.services.filter((s) => s.group === 'food').length, 0)} />
        <StatCard label="Vehicles" icon={Car} tone="teal" value={vehicleRows.length} />
        <StatCard label="Bookings" icon={CalendarCheck} value={bookings.length} hint={`${confirmed.length} confirmed`} />
        <StatCard label="Revenue" icon={Wallet} tone="teal" value={formatRwf(revenue)} hint="Confirmed bookings" />
        <StatCard label="Reviews" icon={Star} tone="amber" value={reviews.length} hint={listing.rating ? `This branch ${listing.rating.toFixed(1)}` : 'No rating yet'} />
      </div>

      <div className="mt-6">
        <FilterTabs
          label="Admin business views"
          value={view}
          onChange={setView}
          options={[
            { value: 'overview', label: 'Overview' },
            { value: 'listings', label: 'Branches', count: listings.length },
            { value: 'rooms', label: 'Rooms', count: rooms.length },
            { value: 'services', label: 'Services', count: services.length },
            { value: 'vehicles', label: 'Vehicles', count: vehicleRows.length },
            { value: 'bookings', label: 'Bookings', count: bookings.length },
            { value: 'reviews', label: 'Reviews', count: reviews.length },
          ]}
        />
      </div>

      <div className="mt-4">
        {view === 'overview' && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <div>
              <SmartImage src={photos[photo] ?? listing.image} alt={`${listing.name}, photo ${photo + 1} of ${photos.length}`} className="aspect-[16/8] w-full rounded-3xl" />
              {photos.length > 1 && (
                <ul className="mt-3 flex gap-2 overflow-x-auto p-1" aria-label="Photos">
                  {photos.map((src, i) => (
                    <li key={src} className="shrink-0">
                      <button type="button" onClick={() => setPhoto(i)} aria-label={`Show photo ${i + 1}`} aria-pressed={i === photo} className={cn('block overflow-hidden rounded-xl ring-2 ring-offset-2 transition', i === photo ? 'ring-brand-600' : 'ring-transparent opacity-80 hover:opacity-100')}>
                        <SmartImage src={src} alt="" className="h-16 w-24" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <section className="rounded-3xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap gap-1.5">
                <Badge tone="solid">{kind}</Badge>
                <ListingApprovalBadge status={listingApproval(listing)} />
                {listing.badges.map((badge) => <Badge key={badge}>{badge}</Badge>)}
              </div>
              <Rating value={listing.rating} count={listing.reviewCount} className="mt-3" />
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{listing.description}</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-700">
                <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-brand-600" aria-hidden />{listing.district}</li>
                <li>
                  {owner ? (
                    <Link to={`/admin/users/${owner.id}`} className="font-semibold text-brand-600 hover:underline">{owner.name}</Link>
                  ) : listing.ownerName}
                  <span className="text-slate-500"> · owner</span>
                </li>
                <li><a href={`tel:${listing.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-2 hover:text-brand-600"><Phone className="h-4 w-4 text-brand-600" aria-hidden />{listing.phone}</a></li>
                <li><a href={`mailto:${listing.email}`} className="inline-flex items-center gap-2 break-all hover:text-brand-600"><Mail className="h-4 w-4 shrink-0 text-brand-600" aria-hidden />{listing.email}</a></li>
              </ul>
            </section>
          </div>
        )}
        {view === 'listings' && (
          <DataTable
            data={listings}
            columns={listingColumns(bookings)}
            getRowId={(b) => b.id}
            searchText={(b) => `${b.name} ${listingKindOf(b)} ${b.district}`}
            searchPlaceholder="Search branches"
            rowActions={(b) => (
              <div className="flex flex-wrap items-center justify-end gap-2">
                <ListingViewLink to={`/admin/businesses/${b.id}/branch`} name={b.name} />
                <ListingReviewActions listing={b} onUpdated={(next) => setData((d) => d && {
                  ...d,
                  listing: d.listing.id === next.id ? next : d.listing,
                  listings: d.listings.map((item) => item.id === next.id ? next : item),
                })} />
              </div>
            )}
            emptyTitle="No branches"
            emptyMessage="This owner has not published a branch."
          />
        )}
        {view === 'rooms' && (
          <DataTable
            data={rooms}
            columns={roomColumns(bookings)}
            getRowId={rowId}
            searchText={(r) => `${r.listing.name} ${r.service.name} ${r.service.category ?? ''}`}
            searchPlaceholder="Search rooms"
            emptyTitle="No rooms"
            emptyMessage="None of this owner's branches have rooms."
          />
        )}
        {view === 'services' && (
          <DataTable
            data={services}
            columns={serviceColumns}
            getRowId={rowId}
            searchText={(r) => `${r.listing.name} ${r.service.name} ${r.service.group ?? ''} ${r.service.unit}`}
            searchPlaceholder="Search services"
            emptyTitle="No services"
            emptyMessage="None of this owner's branches have extra services yet."
          />
        )}
        {view === 'vehicles' && (
          <DataTable
            data={vehicleRows}
            columns={vehicleColumns}
            getRowId={(r) => `${r.listing.id}:${r.service.id}:${r.plate || r.service.id}`}
            searchText={(r) => `${r.listing.name} ${r.service.name} ${r.service.brand ?? ''} ${r.level} ${r.plate} ${r.service.description}`}
            searchPlaceholder="Search vehicles"
            emptyTitle="No vehicles"
            emptyMessage="None of this owner's branches have hire cars yet."
            rowActions={(r) => <ListingViewLink to={`/admin/vehicles/${r.listing.id}/${r.service.id}`} name={r.plate || r.service.name} />}
          />
        )}
        {view === 'bookings' && (
          <DataTable
            data={bookings}
            columns={bookingColumns(['guest', 'target', 'service', 'date', 'total', 'status', 'payment'], { detailsBase: '/admin/bookings', linkGuest: true })}
            getRowId={(b) => b.id}
            searchText={bookingSearchText}
            searchPlaceholder="Search bookings"
            initialSort={{ id: 'date', desc: true }}
            rowActions={(b) => <BookingViewLink to={`/admin/bookings/${b.id}`} />}
            emptyTitle="No bookings"
            emptyMessage="This owner has not received a booking yet."
          />
        )}
        {view === 'reviews' && (
          <DataTable
            data={reviews}
            columns={reviewColumns(['author', 'target', 'rating', 'comment', 'date'])}
            getRowId={(r) => r.id}
            searchText={reviewSearchText}
            searchPlaceholder="Search reviews"
            initialSort={{ id: 'date', desc: true }}
            emptyTitle="No reviews"
            emptyMessage="None of this owner's branches have been reviewed yet."
          />
        )}
      </div>
    </>
  );
}
