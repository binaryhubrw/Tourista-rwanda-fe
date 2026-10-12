import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CalendarCheck, Car, ChevronLeft, Pencil, Users, Wallet } from 'lucide-react';
import { getBookings, getBusinessById, getBusinessesByOwner } from '@/services';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/context/AuthContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Badge, ButtonLink, ErrorState, Loading, SmartImage } from '@/components/ui';
import { DataTable, FilterTabs, PageHeader, StatCard, StatGrid } from '@/components/dashboard';
import { BookingViewLink, bookingColumns, bookingSearchText } from '@/pages/shared/tableColumns';
import { formatRwf } from '@/utils/format';
import { VehicleUnitGallery } from '@/components/business/VehicleCategoryGallery';
import { plateLabel, vehicleCarry, vehiclePhoto, vehiclePlates, vehicleUnits } from '@/utils/catalog';
import type { Booking } from '@/types';

type View = 'overview' | 'bookings' | 'categories';

export default function VehicleDetailsPage({ variant = 'owner' }: { variant?: 'owner' | 'admin' }) {
  const { businessId = '', serviceId = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const admin = variant === 'admin';
  const [view, setView] = useState<View>('overview');
  const biz = useAsync(async () => {
    if (admin) return [await getBusinessById(businessId)];
    return getBusinessesByOwner(user!.id);
  }, [admin, businessId, user?.id]);
  const listing = biz.data?.find((item) => item.id === businessId);
  const vehicle = listing?.services.find((s) => s.id === serviceId && s.group === 'vehicle');
  const extra = useAsync(() => getBookings({ businessIds: [businessId] }), [businessId]);
  const vehiclesTo = admin ? '/admin/vehicles' : '/business-dashboard/vehicles';
  const bookingsBase = admin ? '/admin/bookings' : '/business-dashboard/bookings';
  const branchTo = listing ? (admin ? `/admin/businesses/${listing.id}/branch` : `/business-dashboard/business/${listing.id}`) : vehiclesTo;
  useDocumentTitle(vehicle ? `${vehicle.brand ? `${vehicle.brand} · ` : ''}${vehicle.name}` : 'Vehicle');
  useEffect(() => { setView('overview'); }, [businessId, serviceId]);

  const fleet = listing?.services.filter((s) => s.group === 'vehicle') ?? [];
  const bookings = useMemo(() => {
    const all = extra.data ?? [];
    return all.filter((b) => b.serviceId === serviceId || b.serviceName === vehicle?.name || b.lines?.some((l) => l.serviceId === serviceId));
  }, [extra.data, serviceId, vehicle?.name]);

  if (biz.loading || extra.loading) return <Loading label="Loading vehicle" />;
  if (biz.error) return <ErrorState message={biz.error} onRetry={biz.reload} />;
  if (!listing || !vehicle) return <ErrorState message="That vehicle was not found." onRetry={() => navigate(vehiclesTo)} />;
  if (extra.error) return <ErrorState message={extra.error} onRetry={extra.reload} />;

  const carry = vehicleCarry(vehicle);
  const paid = bookings.filter((b) => b.status === 'Confirmed' || b.status === 'Refunded' || b.status === 'RefundPending');
  const revenue = paid.reduce((n, b) => n + b.totalRwf, 0);
  const title = `${vehicle.brand ? `${vehicle.brand} · ` : ''}${vehicle.name}`;

  return (
    <>
      <ButtonLink to={vehiclesTo} variant="ghost" className="mb-3 -ml-2 w-fit"><ChevronLeft className="h-4 w-4" aria-hidden />Back to vehicles</ButtonLink>
      <PageHeader
        title={title}
        intro={`${vehicle.category ?? 'Hire car'} on ${listing.name}. ${carry.label}.`}
        action={admin ? undefined : <ButtonLink to={`/business-dashboard/vehicles/${listing.id}/${vehicle.id}/edit`}><Pencil className="h-4 w-4" aria-hidden />Edit vehicle</ButtonLink>}
      />

      <StatGrid>
        <StatCard label="Fleet" icon={Car} value={vehicle.available ?? 1} hint={(vehicle.available ?? 1) === 1 ? 'car of this type' : 'cars of this type'} />
        <StatCard label="Carries" icon={Users} tone="teal" value={carry.seats} hint={carry.peopleLabel} />
        <StatCard label="Bookings" icon={CalendarCheck} tone="amber" value={bookings.length} hint="All statuses" />
        <StatCard label="From bookings" icon={Wallet} tone="violet" value={formatRwf(revenue)} hint="Confirmed and refunded hires" />
      </StatGrid>

      <div className="mt-6">
        <FilterTabs
          label="Vehicle views"
          value={view}
          onChange={setView}
          options={[
            { value: 'overview', label: 'Overview' },
            { value: 'bookings', label: 'Bookings', count: bookings.length },
            { value: 'categories', label: 'Categories', count: fleet.reduce((n, s) => n + vehicleUnits(s).length, 0) },
          ]}
        />
      </div>

      <div className="mt-4">
        {view === 'overview' && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <SmartImage src={vehiclePhoto(vehicle)} alt={title} className="aspect-[16/8] w-full rounded-3xl" />
            <section className="rounded-3xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap gap-1.5">
                <Badge tone="solid">{vehicle.category ?? 'Vehicle'}</Badge>
                {vehicle.brand && <Badge>{vehicle.brand}</Badge>}
                <Badge>{carry.label}</Badge>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate-600">{vehicle.description || 'No description yet.'}</p>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Price per day</dt><dd className="font-semibold tabular-nums text-ink">{formatRwf(vehicle.priceRwf)}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Level</dt><dd className="font-semibold">{vehicle.category ?? '—'}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Plates</dt><dd className="text-right font-semibold tracking-wide">{vehiclePlates(vehicle).join(' · ') || plateLabel(vehicle)}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Cars of this type</dt><dd className="font-semibold tabular-nums">{vehicle.available ?? 1}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Seats / people</dt><dd className="font-semibold">{carry.label}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Branch</dt><dd><Link to={branchTo} className="font-semibold text-brand-600 hover:underline">{listing.name}</Link></dd></div>
              </dl>
              {!admin && <ButtonLink to={`/businesses/${listing.id}#offer-${vehicle.id}`} variant="secondary" className="mt-5">View public branch</ButtonLink>}
            </section>
          </div>
        )}
        {view === 'bookings' && (
          <DataTable
            data={bookings}
            columns={bookingColumns(['guest', 'date', 'units', 'people', 'total', 'status', 'payment'], { detailsBase: bookingsBase })}
            getRowId={(b: Booking) => b.id}
            searchText={bookingSearchText}
            searchPlaceholder="Search bookings"
            initialSort={{ id: 'date', desc: true }}
            rowActions={(b) => <BookingViewLink to={`${bookingsBase}/${b.id}`} />}
            emptyTitle="No bookings for this vehicle"
            emptyMessage="When travellers hire this car, the requests appear here."
          />
        )}
        {view === 'categories' && (
          <div>
            <p className="mb-4 text-sm text-slate-600">Each car in the fleet, with its photo and plate, grouped by hire level. This type is {vehicle.category ?? 'Standard'}.</p>
            <VehicleUnitGallery fleet={fleet} highlight={vehicle.category} />
          </div>
        )}
      </div>
    </>
  );
}
