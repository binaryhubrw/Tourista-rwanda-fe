import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Pencil, Phone, Mail, MapPin, BedDouble, Sparkles, UtensilsCrossed, Package, Plus } from 'lucide-react';
import { getBookings, getReviews } from '@/services';
import { useAsync } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Badge, ButtonLink, ErrorState, Loading, Rating, SmartImage, spanLabel } from '@/components/ui';
import { DataTable, FilterTabs, PageHeader, StatCard, StatGrid, VehicleCategoryBadge, type Column } from '@/components/dashboard';
import { cn } from '@/utils/cn';
import { BookingViewLink, ListingViewLink, bookingColumns, bookingSearchText } from '../shared/tableColumns';
import { formatRwf } from '@/utils/format';
import { isRoom } from '@/utils/pricing';
import { listingKindOf, vehicleCarry, vehicleLevelPhoto, vehicleUnits } from '@/utils/catalog';
import { roomStatus } from '@/utils/availability';
import { useOwnerBusinesses } from './useOwnerBusinesses';
import type { Booking, Service } from '@/types';

interface VehicleRow {
  service: Service;
  plate: string;
  image: string;
  level: string;
}

type View = 'overview' | 'rooms' | 'services' | 'vehicles' | 'bookings';

const offerName = (s: Service) => (s.category && s.category !== s.name ? `${s.category} · ${s.name}` : s.name);

const roomColumns = (bookings: Booking[]): Column<Service>[] => [
  { id: 'name', header: 'Room', sortValue: (s) => s.name, cell: (s) => (
    <div className="min-w-0">
      <p className="font-semibold text-ink">{offerName(s)}</p>
      {s.description && <p className="text-xs text-slate-500">{s.description}</p>}
    </div>
  ) },
  { id: 'rooms', header: 'Rooms', align: 'right', sortValue: (s) => s.available ?? 0, cell: (s) => <span className="tabular-nums">{s.available ?? '—'}</span> },
  { id: 'beds', header: 'Beds', align: 'right', sortValue: (s) => s.available ?? 0, cell: (s) => <span className="tabular-nums">{s.available ?? 1}</span> },
  { id: 'status', header: 'Status', sortValue: (s) => roomStatus(s, bookings).label, cell: (s) => {
    const status = roomStatus(s, bookings);
    return <Badge tone={status.tone}>{status.label}</Badge>;
  } },
  { id: 'dates', header: 'Booked dates', cell: (s) => {
    const { spans } = roomStatus(s, bookings);
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
  { id: 'price', header: 'Per night', align: 'right', sortValue: (s) => s.priceRwf, cell: (s) => <span className="tabular-nums">{formatRwf(s.priceRwf)}</span> },
];

const vehicleColumns: Column<VehicleRow>[] = [
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
  { id: 'plate', header: 'Plate', sortValue: (r) => r.plate, cell: (r) => <span className="whitespace-nowrap font-semibold tabular-nums tracking-wide">{r.plate}</span> },
  { id: 'seats', header: 'Seats', align: 'right', sortValue: (r) => r.service.capacity ?? 0, cell: (r) => <span className="tabular-nums">{vehicleCarry(r.service).peopleLabel}</span> },
  { id: 'price', header: 'Per day', align: 'right', sortValue: (r) => r.service.priceRwf, cell: (r) => <span className="tabular-nums">{formatRwf(r.service.priceRwf)}</span> },
];

const serviceColumns: Column<Service>[] = [
  { id: 'name', header: 'Service', sortValue: (s) => s.name, cell: (s) => (
    <div className="min-w-0">
      <p className="font-semibold text-ink">{offerName(s)}</p>
      <p className="text-xs text-slate-500">{s.group === 'wellness' ? 'Wellness' : s.group === 'food' ? 'Food & drink' : 'Other'}</p>
    </div>
  ) },
  { id: 'unit', header: 'Charged', sortValue: (s) => s.unit, cell: (s) => s.unit },
  { id: 'price', header: 'Price', align: 'right', sortValue: (s) => s.priceRwf, cell: (s) => <span className="tabular-nums">{formatRwf(s.priceRwf)}</span> },
  { id: 'available', header: 'Capacity', align: 'right', sortValue: (s) => s.available ?? 0, cell: (s) => <span className="tabular-nums">{s.available ?? '—'}</span> },
];

export default function OwnerListingDetailsPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [view, setView] = useState<View>('overview');
  const [photo, setPhoto] = useState(0);
  const biz = useOwnerBusinesses();
  const listing = biz.data?.find((item) => item.id === id);
  const extra = useAsync(async () => {
    const [bookings, reviews] = await Promise.all([getBookings({ businessIds: [id] }), getReviews({ targetId: id })]);
    return { bookings, reviews };
  }, [id]);
  useDocumentTitle(listing ? listing.name : 'Branch');
  useEffect(() => { setPhoto(0); setView('overview'); }, [id]);

  if (biz.loading || extra.loading) return <Loading label="Loading branch" />;
  if (biz.error) return <ErrorState message={biz.error} onRetry={biz.reload} />;
  if (!listing) return <ErrorState message="That branch was not found." onRetry={() => navigate('/business-dashboard/business')} />;
  if (extra.error || !extra.data) return <ErrorState message={extra.error ?? undefined} onRetry={extra.reload} />;

  const kind = listingKindOf(listing);
  const rooms = listing.services.filter(isRoom);
  const wellness = listing.services.filter((s) => s.group === 'wellness');
  const food = listing.services.filter((s) => s.group === 'food');
  const vehicles = listing.services.filter((s) => s.group === 'vehicle');
  const vehicleRows: VehicleRow[] = vehicles.flatMap((service) =>
    vehicleUnits(service).map((unit) => ({
      service,
      plate: unit.plate,
      image: unit.image || vehicleLevelPhoto(unit.level || service.category),
      level: unit.level || service.category || 'Standard',
    })),
  );
  const { bookings, reviews } = extra.data;
  const photos = [listing.image, ...(listing.gallery ?? [])].filter((src, i, all) => src && all.indexOf(src) === i);

  return (
    <>
      <ButtonLink to="/business-dashboard/business" variant="ghost" className="mb-3 -ml-2 w-fit"><ChevronLeft className="h-4 w-4" aria-hidden />Back to branches</ButtonLink>
      <PageHeader
        title={listing.name}
        intro={`${kind} in ${listing.district}. This is your branch, not the public page.`}
        action={<ButtonLink to={`/business-dashboard/business/${listing.id}/edit`}><Pencil className="h-4 w-4" aria-hidden />Edit branch</ButtonLink>}
      />

      <StatGrid className="grid-cols-2">
        <StatCard label="Rooms" icon={BedDouble} value={rooms.reduce((n, r) => n + (r.available ?? 1), 0)} />
        <StatCard label="Wellness" icon={Sparkles} tone="violet" value={wellness.length} />
        <StatCard label="Food & drink" icon={UtensilsCrossed} tone="amber" value={food.length} />
        <StatCard label="All offerings" icon={Package} tone="teal" value={listing.services.length} />
      </StatGrid>

      <div className="mt-6">
        <FilterTabs
          label="Branch views"
          value={view}
          onChange={setView}
          options={[
            { value: 'overview', label: 'Overview' },
            { value: 'rooms', label: 'Rooms', count: rooms.length },
            { value: 'services', label: 'Services', count: listing.services.filter((s) => !isRoom(s) && s.group !== 'vehicle').length },
            { value: 'vehicles', label: 'Vehicles', count: vehicleRows.length },
            { value: 'bookings', label: 'Bookings', count: bookings.length },
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
                {listing.badges.map((badge) => <Badge key={badge}>{badge}</Badge>)}
              </div>
              <Rating value={listing.rating} count={listing.reviewCount} className="mt-3" />
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{listing.description}</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-700">
                <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-brand-600" aria-hidden />{listing.district}</li>
                <li><a href={`tel:${listing.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-2 hover:text-brand-600"><Phone className="h-4 w-4 text-brand-600" aria-hidden />{listing.phone}</a></li>
                <li><a href={`mailto:${listing.email}`} className="inline-flex items-center gap-2 break-all hover:text-brand-600"><Mail className="h-4 w-4 shrink-0 text-brand-600" aria-hidden />{listing.email}</a></li>
              </ul>
              {reviews.length > 0 && (
                <p className="mt-4 text-sm text-slate-600">{reviews.length} review{reviews.length === 1 ? '' : 's'} · <Link to="/business-dashboard/reviews" className="font-semibold text-brand-600 hover:underline">Open reviews</Link></p>
              )}
            </section>
          </div>
        )}
        {view === 'rooms' && (
          <DataTable
            data={rooms}
            columns={roomColumns(bookings)}
            getRowId={(s) => s.id}
            searchText={(s) => `${s.name} ${s.category ?? ''} ${s.bedType ?? ''}`}
            searchPlaceholder="Search rooms"
            emptyTitle="No rooms on this branch"
            emptyMessage="Stays show room categories here. For a restaurant or bar, open Services."
          />
        )}
        {view === 'services' && (
          <DataTable
            data={listing.services.filter((s) => !isRoom(s) && s.group !== 'vehicle')}
            columns={serviceColumns}
            getRowId={(s) => s.id}
            searchText={(s) => `${s.name} ${s.category ?? ''} ${s.unit} ${s.group ?? ''}`}
            searchPlaceholder="Search services"
            emptyTitle="No services yet"
            emptyMessage="Wellness, meals, drinks and extra bookings appear here."
          />
        )}
        {view === 'vehicles' && (
          <>
          <div className="mb-4 flex justify-end">
            <ButtonLink to={`/business-dashboard/vehicles/new?listing=${listing.id}&from=listing`}><Plus className="h-4 w-4" aria-hidden />Add vehicle</ButtonLink>
          </div>
          <DataTable
            data={vehicleRows}
            columns={vehicleColumns}
            getRowId={(r) => `${r.service.id}:${r.plate}`}
            searchText={(r) => `${r.service.name} ${r.service.brand ?? ''} ${r.level} ${r.plate} ${r.service.description}`}
            initialPageSize={25}
            searchPlaceholder="Search vehicles"
            emptyTitle="No vehicles yet"
            emptyMessage="Add cars with a photo, level and plate. Travellers book them on the public branch."
            emptyAction={<ButtonLink to={`/business-dashboard/vehicles/new?listing=${listing.id}&from=listing`}><Plus className="h-4 w-4" aria-hidden />Add vehicle</ButtonLink>}
            rowActions={(r) => (
              <div className="flex justify-end gap-1">
                <ListingViewLink to={`/business-dashboard/vehicles/${listing.id}/${r.service.id}`} name={r.plate} />
                <Link to={`/business-dashboard/vehicles/${listing.id}/${r.service.id}/edit?from=listing`} className="inline-grid h-9 w-9 place-items-center rounded-lg text-brand-600 hover:bg-brand-50" aria-label={`Edit ${r.plate}`}><Pencil className="h-4 w-4" /></Link>
              </div>
            )}
          />
          </>
        )}
        {view === 'bookings' && (
          <DataTable
            data={bookings}
            columns={bookingColumns(['guest', 'service', 'date', 'total', 'status'], { detailsBase: '/business-dashboard/bookings' })}
            getRowId={(b) => b.id}
            searchText={bookingSearchText}
            searchPlaceholder="Search bookings"
            initialSort={{ id: 'date', desc: true }}
            rowActions={(b) => <BookingViewLink to={`/business-dashboard/bookings/${b.id}`} />}
            emptyTitle="No bookings yet"
            emptyMessage="When travellers book this branch, they will appear here."
          />
        )}
      </div>
    </>
  );
}
