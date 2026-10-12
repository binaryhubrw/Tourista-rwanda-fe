import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Car, Pencil, Plus, Tag, Trash2, TrendingUp, Wallet } from 'lucide-react';
import type { Business, Service, User } from '@/types';
import { getBookings, getBusinesses, getBusinessesByOwner, getUsers, updateBusiness } from '@/services';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useToast } from '@/context/ToastContext';
import { errorMessage, useAsync } from '@/hooks/useAsync';
import { Button, ButtonLink, ConfirmModal, EmptyState, ErrorState, Loading, SmartImage } from '@/components/ui';
import { DataTable, FilterTabs, PageHeader, StatCard, StatGrid, VehicleCategoryBadge, type Column } from '@/components/dashboard';
import { ListingViewLink } from '@/pages/shared/tableColumns';
import { formatRwf, formatRwfShort } from '@/utils/format';
import { VEHICLE_LEVELS, vehicleCarry, vehicleLevelPhoto, vehicleUnits, withoutPlates } from '@/utils/catalog';
import { bookingLines } from '@/utils/availability';
import { useAuth } from '@/context/AuthContext';

const companyName = (listing: Business, users: User[]) => {
  const owner = listing.ownerId ? users.find((user) => user.id === listing.ownerId) : undefined;
  return owner?.businessName?.trim() || listing.ownerName || listing.name;
};

type LevelFilter = 'All' | (typeof VEHICLE_LEVELS)[number];

interface Row {
  service: Service;
  business: Business;
  plate: string;
  image: string;
  level: string;
  bookings: number;
  revenue: number;
}

const rowId = (r: Row) => `${r.business.id}:${r.service.id}:${r.plate}`;

export default function VehiclesPage({ variant = 'owner' }: { variant?: 'owner' | 'admin' }) {
  useDocumentTitle('Vehicles');
  const toast = useToast();
  const { user } = useAuth();
  const admin = variant === 'admin';
  const { data, loading, error, reload, setData } = useAsync(async () => {
    if (admin) {
      const [businesses, bookings, users] = await Promise.all([getBusinesses(), getBookings(), getUsers()]);
      return { businesses, bookings, users };
    }
    const businesses = await getBusinessesByOwner(user!.id);
    const ids = businesses.map((item) => item.id);
    const bookings = ids.length ? await getBookings({ businessIds: ids }) : [];
    return { businesses, bookings, users: [] as User[] };
  }, [admin, user?.id]);
  const vehicleBase = admin ? '/admin/vehicles' : '/business-dashboard/vehicles';
  const branchHref = (listing: Business) => (admin ? `/admin/businesses/${listing.id}/branch` : `/business-dashboard/business/${listing.id}`);
  const [level, setLevel] = useState<LevelFilter>('All');
  const [removing, setRemoving] = useState<{ rows: Row[]; done?: () => void } | null>(null);

  const businesses = data?.businesses ?? [];
  const rows = useMemo<Row[]>(() => {
    const bookings = (data?.bookings ?? []).filter((b) => !['Canceled', 'Declined', 'Expired'].includes(b.status));
    return (data?.businesses ?? []).flatMap((business) =>
      business.services.filter((s) => s.group === 'vehicle').flatMap((service) => {
        const units = vehicleUnits(service);
        return units.map((unit, index) => {
          const mine = bookings.filter((b) =>
            bookingLines(b).some((line) => {
              const same = line.serviceId === service.id || line.serviceName === service.name;
              if (!same) return false;
              if (line.plateNumbers?.length) return line.plateNumbers.includes(unit.plate);
              return index === 0;
            }),
          );
          const paid = mine.filter((b) => b.status === 'Confirmed' || b.status === 'Refunded' || b.status === 'RefundPending');
          return {
            service,
            business,
            plate: unit.plate,
            image: unit.image || vehicleLevelPhoto(unit.level || service.category),
            level: unit.level || service.category || 'Standard',
            bookings: mine.length,
            revenue: paid.reduce((n, b) => n + b.totalRwf, 0),
          };
        });
      }),
    );
  }, [data]);

  const visible = level === 'All' ? rows : rows.filter((r) => r.level === level);

  const persist = async (changed: Row[]) => {
    const groups = new Map<string, { business: Business; service: Service; plates: Set<string> }>();
    changed.forEach((row) => {
      const key = `${row.business.id}:${row.service.id}`;
      const group = groups.get(key) ?? { business: row.business, service: row.service, plates: new Set<string>() };
      group.plates.add(row.plate);
      groups.set(key, group);
    });
    const updated = await Promise.all([...groups.values()].map(({ business, service, plates }) => {
      const next = withoutPlates(service, plates);
      const services = vehicleUnits(next).length
        ? business.services.map((s) => (s.id === service.id ? next : s))
        : business.services.filter((s) => s.id !== service.id);
      return updateBusiness(business.id, { services });
    }));
    const byId = new Map(updated.map((b) => [b.id, b]));
    setData((d) => d && { ...d, businesses: d.businesses.map((b) => byId.get(b.id) ?? b) });
  };

  const confirmRemove = async () => {
    if (!removing) return;
    try {
      await persist(removing.rows);
      toast.success(removing.rows.length > 1 ? `${removing.rows.length} cars deleted.` : `${removing.rows[0].plate} deleted.`);
      removing.done?.();
      setRemoving(null);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const columns = useMemo<Column<Row>[]>(() => {
    const users = data?.users ?? [];
    const listingCol: Column<Row>[] = admin || businesses.length > 1
      ? [{ id: 'branch', header: 'Branch', sortValue: (r) => r.business.name, cell: (r) => <Link to={branchHref(r.business)} className="font-semibold text-ink hover:text-brand-700 hover:underline">{r.business.name}</Link> }]
      : [];
    const companyCol: Column<Row>[] = admin
      ? [{ id: 'company', header: 'Business', sortValue: (r) => companyName(r.business, users), cell: (r) => companyName(r.business, users) }]
      : [];
    return [
      {
        id: 'name', header: 'Vehicle', sortValue: (r) => r.service.name,
        cell: (r) => (
          <div className="flex min-w-[240px] items-center gap-3">
            <SmartImage src={r.image} alt="" className="h-14 w-20 shrink-0 rounded-xl" />
            <div className="min-w-0">
              <Link to={`${vehicleBase}/${r.business.id}/${r.service.id}`} className="font-semibold text-ink hover:text-brand-700 hover:underline">{r.service.brand ? `${r.service.brand} · ` : ''}{r.service.name}</Link>
              <p className="line-clamp-1 text-xs text-slate-500">{vehicleCarry(r.service).label}</p>
            </div>
          </div>
        ),
      },
      { id: 'category', header: 'Category', sortValue: (r) => r.level, cell: (r) => <VehicleCategoryBadge category={r.level} /> },
      { id: 'plate', header: 'Plate', sortValue: (r) => r.plate, cell: (r) => <span className="whitespace-nowrap font-semibold tabular-nums tracking-wide">{r.plate}</span> },
      { id: 'seats', header: 'Seats', align: 'right', sortValue: (r) => r.service.capacity ?? 0, cell: (r) => <span className="tabular-nums">{vehicleCarry(r.service).peopleLabel}</span> },
      ...listingCol,
      ...companyCol,
      { id: 'price', header: 'Per day', align: 'right', sortValue: (r) => r.service.priceRwf, cell: (r) => <span className="whitespace-nowrap font-semibold tabular-nums text-ink">{formatRwf(r.service.priceRwf)}</span> },
      { id: 'bookings', header: 'Bookings', align: 'right', sortValue: (r) => r.bookings, cell: (r) => <span className="tabular-nums">{r.bookings}</span> },
      { id: 'revenue', header: 'Revenue', align: 'right', sortValue: (r) => r.revenue, cell: (r) => <span className="whitespace-nowrap tabular-nums">{formatRwf(r.revenue)}</span> },
    ];
  }, [admin, businesses.length, data?.users, vehicleBase]);

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading) return <Loading />;

  if (!businesses.length) {
    return (
      <>
        <PageHeader title="Vehicles" />
        <div className="mt-6"><EmptyState title={admin ? 'No vehicles yet' : user?.role === 'staff' ? 'No assigned branches' : 'Add a branch first'} message={admin ? 'When businesses list hire cars, they appear here.' : user?.role === 'staff' ? 'Vehicles belong to a branch. Once a branch is assigned to you, its fleet appears here.' : 'Vehicles belong to a branch, the same way rooms do.'} action={!admin && user?.role === 'business_owner' ? <ButtonLink to="/business-dashboard/business/new">Add branch</ButtonLink> : undefined} /></div>
      </>
    );
  }

  const prices = rows.map((r) => r.service.priceRwf);
  const top = [...rows].sort((a, b) => b.revenue - a.revenue)[0];
  const mostBooked = [...rows].sort((a, b) => b.bookings - a.bookings)[0];

  return (
    <>
      <PageHeader
        title="Vehicles"
        intro={admin ? 'Every hire car on the platform, with its plate, branch and bookings.' : 'Each car on your branches, with its plate and hire level.'}
        action={admin ? undefined : <ButtonLink to="/business-dashboard/vehicles/new"><Plus className="h-4 w-4" aria-hidden />Add vehicle</ButtonLink>}
      />
      <StatGrid>
        <StatCard label="Vehicle types" icon={Car} value={new Set(rows.map((r) => r.service.id)).size} hint={`${rows.length} car${rows.length === 1 ? '' : 's'}${admin ? ' listed' : ' on the branches'}`} />
        <StatCard label="Price range" icon={Tag} tone="teal" value={prices.length ? `${formatRwfShort(Math.min(...prices))}–${formatRwfShort(Math.max(...prices)).replace('RWF ', '')}` : '—'} hint="Per day" />
        <StatCard label="Most booked" icon={TrendingUp} tone="amber" value={mostBooked?.bookings ?? 0} hint={mostBooked?.bookings ? `${mostBooked.service.name} · ${mostBooked.plate}` : 'No bookings yet'} />
        <StatCard label="Top earner" icon={Wallet} tone="violet" value={formatRwfShort(top?.revenue ?? 0)} hint={top?.revenue ? `${top.service.name} · ${top.plate}` : 'No revenue yet'} />
      </StatGrid>
      <div className="mt-6">
        <FilterTabs
          label="Filter by hire level"
          value={level}
          onChange={setLevel}
          options={[
            { value: 'All', label: 'All', count: rows.length },
            ...VEHICLE_LEVELS.map((name) => ({ value: name, label: name, count: rows.filter((r) => r.level === name).length })),
          ]}
        />
      </div>
      <DataTable
        className="mt-4"
        data={visible}
        columns={columns}
        getRowId={rowId}
        initialSort={{ id: 'plate', desc: false }}
        initialPageSize={25}
        searchText={(r) => `${r.service.name} ${r.service.brand ?? ''} ${r.level} ${r.plate} ${r.service.description} ${r.business.name}`}
        searchPlaceholder="Search cars"
        exportFileName="vehicles"
        bulkActions={admin ? undefined : (selected, clear) => <Button size="sm" variant="danger" onClick={() => setRemoving({ rows: selected, done: clear })}><Trash2 className="h-4 w-4" aria-hidden />Delete selected</Button>}
        rowActions={(r) => (
          <div className="flex justify-end gap-1">
            <ListingViewLink to={`${vehicleBase}/${r.business.id}/${r.service.id}`} name={r.plate} />
            {!admin && (
              <>
                <Link to={`/business-dashboard/vehicles/${r.business.id}/${r.service.id}/edit`} className="inline-grid h-9 w-9 place-items-center rounded-lg text-brand-600 hover:bg-brand-50" aria-label={`Edit ${r.plate}`}><Pencil className="h-4 w-4" /></Link>
                <button onClick={() => setRemoving({ rows: [r] })} className="inline-grid h-9 w-9 place-items-center rounded-lg text-red-600 hover:bg-red-50" aria-label={`Delete ${r.plate}`}><Trash2 className="h-4 w-4" /></button>
              </>
            )}
          </div>
        )}
        emptyTitle={level === 'All' ? 'No vehicles yet' : `No ${level} cars`}
        emptyMessage={level === 'All' ? (admin ? 'No hire cars have been listed yet.' : 'Add cars one by one, each with a photo, level and plate.') : (admin ? `No ${level} cars are listed.` : `Add a ${level} car from Add vehicle.`)}
        emptyAction={admin ? undefined : <ButtonLink to="/business-dashboard/vehicles/new"><Plus className="h-4 w-4" aria-hidden />Add vehicle</ButtonLink>}
      />

      <ConfirmModal
        open={!!removing}
        title={removing && removing.rows.length > 1 ? `Delete ${removing.rows.length} cars?` : `Delete “${removing?.rows[0]?.plate ?? ''}”?`}
        message={removing && removing.rows.length > 1
          ? 'These cars will no longer be bookable. Existing bookings are kept.'
          : `“${removing?.rows[0]?.plate}” will no longer be bookable. Existing bookings are kept.`}
        confirmLabel="Delete"
        onCancel={() => setRemoving(null)}
        onConfirm={confirmRemove}
      />
    </>
  );
}
