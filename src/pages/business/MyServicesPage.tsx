import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Package, Tag, TrendingUp, Wallet, BedDouble, Users } from 'lucide-react';
import type { Business, Service } from '@/types';
import { updateBusiness } from '@/services';
import { errorMessage } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useToast } from '@/context/ToastContext';
import { Button, ButtonLink, ConfirmModal, EmptyState, ErrorState, Input, Loading, Modal, Select } from '@/components/ui';
import { DataTable, FilterTabs, PageHeader, StatCard, StatGrid, type Column } from '@/components/dashboard';
import { formatRwf, formatRwfShort } from '@/utils/format';
import { makeId } from '@/utils/id';
import { isRoom } from '@/utils/pricing';
import { useOwnerActivity } from './useOwnerBusinesses';

type View = 'rooms' | 'services';

const serviceUnits = ['per person', 'per day', 'per item', 'per group', 'per plate', 'per drink', 'per cup', 'per bag'];
const blank = { name: '', description: '', priceRwf: '', unit: 'per night', businessId: '', capacity: '2', available: '1', bedType: '', amenities: '' };

interface Row { service: Service; business: Business; bookings: number; revenue: number }
const rowId = (r: Row) => `${r.business.id}:${r.service.id}`;

export default function MyServicesPage() {
  useDocumentTitle('Rooms & services');
  const toast = useToast();
  const { data, loading, error, reload, setData } = useOwnerActivity();
  const [view, setView] = useState<View>('rooms');
  const [editing, setEditing] = useState<Row | 'new' | null>(null);
  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [removing, setRemoving] = useState<{ rows: Row[]; done?: () => void } | null>(null);
  const [saving, setSaving] = useState(false);

  const roomsView = view === 'rooms';
  const businesses = data?.businesses ?? [];
  const allRows = useMemo<Row[]>(() => {
    const bookings = (data?.bookings ?? []).filter((b) => b.status === 'Confirmed');
    return (data?.businesses ?? []).flatMap((business) =>
      business.services.map((service) => {
        const mine = bookings.filter((b) => b.businessId === business.id && b.serviceName === service.name);
        return { service, business, bookings: mine.length, revenue: mine.reduce((s, b) => s + b.totalRwf, 0) };
      }),
    );
  }, [data]);
  const roomRows = allRows.filter((r) => isRoom(r.service));
  const serviceRows = allRows.filter((r) => !isRoom(r.service));
  const rows = roomsView ? roomRows : serviceRows;

  const columns = useMemo<Column<Row>[]>(() => {
    const listingCol: Column<Row>[] = businesses.length > 1
      ? [{ id: 'business', header: 'Listing', sortValue: (r) => r.business.name, cell: (r) => r.business.name }]
      : [];
    const shared: Column<Row>[] = [
      { id: 'price', header: 'Price', align: 'right', sortValue: (r) => r.service.priceRwf, cell: (r) => <span className="whitespace-nowrap font-semibold tabular-nums text-ink">{formatRwf(r.service.priceRwf)}</span> },
      { id: 'bookings', header: 'Bookings', align: 'right', sortValue: (r) => r.bookings, cell: (r) => <span className="tabular-nums">{r.bookings}</span> },
      { id: 'revenue', header: 'Revenue', align: 'right', sortValue: (r) => r.revenue, cell: (r) => <span className="whitespace-nowrap tabular-nums">{formatRwf(r.revenue)}</span> },
    ];
    if (roomsView) {
      return [
        {
          id: 'name', header: 'Room', sortValue: (r) => r.service.name,
          cell: (r) => (
            <div className="min-w-[220px]">
              <p className="font-semibold text-ink">{r.service.name}</p>
              <p className="line-clamp-1 text-xs text-slate-500">{r.service.description || 'No description'}</p>
            </div>
          ),
        },
        {
          id: 'rooms', header: 'Rooms / sleeps', sortValue: (r) => r.service.available ?? 0,
          exportValue: (r) => `${r.service.available ?? 1} rooms, sleeps ${r.service.capacity ?? 2}`,
          cell: (r) => (
            <div className="whitespace-nowrap text-sm">
              <p className="flex items-center gap-1.5"><BedDouble className="h-3.5 w-3.5 text-brand-600" aria-hidden />{r.service.available ?? 1} {(r.service.available ?? 1) === 1 ? 'room' : 'rooms'}</p>
              <p className="flex items-center gap-1.5 text-xs text-slate-500"><Users className="h-3.5 w-3.5" aria-hidden />Sleeps {r.service.capacity ?? 2}{r.service.bedType ? ` · ${r.service.bedType}` : ''}</p>
            </div>
          ),
        },
        ...listingCol,
        ...shared,
      ];
    }
    return [
      {
        id: 'name', header: 'Service', sortValue: (r) => r.service.name,
        cell: (r) => (
          <div className="min-w-[220px]">
            <p className="font-semibold text-ink">{r.service.name}</p>
            <p className="line-clamp-1 text-xs text-slate-500">{r.service.description || 'No description'}</p>
          </div>
        ),
      },
      ...listingCol,
      { id: 'unit', header: 'Charged', sortValue: (r) => r.service.unit, cell: (r) => <span className="whitespace-nowrap text-slate-500">{r.service.unit}</span> },
      ...shared,
    ];
  }, [businesses.length, roomsView]);

  const open = (r: Row | 'new') => {
    setEditing(r);
    setErrors({});
    setForm(r === 'new'
      ? { ...blank, businessId: businesses[0]?.id ?? '', unit: 'per person' }
      : {
        name: r.service.name, description: r.service.description, priceRwf: String(r.service.priceRwf), unit: r.service.unit, businessId: r.business.id,
        capacity: String(r.service.capacity ?? 2), available: String(r.service.available ?? 1), bedType: r.service.bedType ?? '', amenities: (r.service.amenities ?? []).join(', '),
      });
  };

  const persist = async (changes: Map<string, Service[]>, msg: string) => {
    setSaving(true);
    try {
      const updated = await Promise.all([...changes].map(([id, services]) => updateBusiness(id, { services })));
      const byId = new Map(updated.map((b) => [b.id, b]));
      setData((d) => d && { ...d, businesses: d.businesses.map((b) => byId.get(b.id) ?? b) });
      toast.success(msg);
      setEditing(null);
      removing?.done?.();
      setRemoving(null);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const save = () => {
    const er: Record<string, string> = {};
    const room = !!editing && editing !== 'new' && isRoom(editing.service);
    if (form.name.trim().length < 3) er.name = room ? 'Enter a room name.' : 'Enter a service name.';
    if (!(Number(form.priceRwf) > 0)) er.priceRwf = 'Enter a price in RWF.';
    if (room) {
      if (!(Number(form.capacity) >= 1)) er.capacity = 'At least 1 guest.';
      if (!(Number(form.available) >= 1)) er.available = 'At least 1 room.';
    }
    setErrors(er);
    const business = businesses.find((b) => b.id === form.businessId);
    if (Object.keys(er).length || !business || !editing) return;
    const svc: Service = {
      id: editing === 'new' ? makeId('svc') : editing.service.id, name: form.name.trim(), description: form.description.trim(), priceRwf: Math.round(Number(form.priceRwf)), unit: room ? 'per night' : form.unit,
      ...(room && {
        capacity: Math.round(Number(form.capacity)), available: Math.round(Number(form.available)), bedType: form.bedType.trim() || undefined,
        amenities: form.amenities.split(',').map((a) => a.trim()).filter(Boolean),
      }),
    };
    const services = editing === 'new' ? [...business.services, svc] : business.services.map((s) => (s.id === svc.id ? svc : s));
    persist(new Map([[business.id, services]]), editing === 'new' ? (room ? 'Room added.' : 'Service added.') : (room ? 'Room updated.' : 'Service updated.'));
  };

  const confirmRemove = () => {
    if (!removing) return;
    const n = removing.rows.length;
    const noun = roomsView ? (n > 1 ? 'rooms' : 'room') : (n > 1 ? 'services' : 'service');
    const changes = new Map<string, Service[]>();
    removing.rows.forEach(({ business, service }) => {
      const current = changes.get(business.id) ?? business.services;
      changes.set(business.id, current.filter((s) => s.id !== service.id));
    });
    persist(changes, n > 1 ? `${n} ${noun} deleted.` : `${noun[0].toUpperCase()}${noun.slice(1)} deleted.`);
  };

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading) return <Loading />;

  if (!businesses.length) {
    return (
      <>
        <PageHeader title="Rooms & services" />
        <StatGrid><StatCard label="Listings" icon={Package} value={0} hint="Rooms and services belong to a listing" /></StatGrid>
        <div className="mt-6"><EmptyState title="Add a listing first" message="Rooms and services belong to a listing." action={<ButtonLink to="/business-dashboard/business/new">Add listing</ButtonLink>} /></div>
      </>
    );
  }

  const prices = rows.map((r) => r.service.priceRwf);
  const top = [...rows].sort((a, b) => b.revenue - a.revenue)[0];
  const mostBooked = [...rows].sort((a, b) => b.bookings - a.bookings)[0];
  const bookableRooms = roomRows.reduce((n, r) => n + (r.service.available ?? 1), 0);

  return (
    <>
      <PageHeader
        title={roomsView ? 'Rooms' : 'Services'}
        intro={roomsView ? 'Room types travellers can book, with how many you have and what they sleep.' : 'Tours, meals, wellness and other extras travellers can add to a stay or visit.'}
        action={!roomsView ? <Button onClick={() => open('new')}><Plus className="h-4 w-4" aria-hidden />Add service</Button> : undefined}
      />

      <FilterTabs
        label="Rooms or services"
        value={view}
        onChange={setView}
        options={[
          { value: 'rooms', label: 'Rooms', count: roomRows.length },
          { value: 'services', label: 'Services', count: serviceRows.length },
        ]}
      />

      <StatGrid className="mt-6">
        {roomsView ? (
          <>
            <StatCard label="Room types" icon={BedDouble} value={roomRows.length} hint={`${bookableRooms} bookable room${bookableRooms === 1 ? '' : 's'} across ${businesses.length} listing${businesses.length === 1 ? '' : 's'}`} />
            <StatCard label="Price range" icon={Tag} tone="teal" value={prices.length ? `${formatRwfShort(Math.min(...prices))}–${formatRwfShort(Math.max(...prices)).replace('RWF ', '')}` : '—'} hint="Per night" />
          </>
        ) : (
          <>
            <StatCard label="Services" icon={Package} value={serviceRows.length} hint="Not including rooms" />
            <StatCard label="Price range" icon={Tag} tone="teal" value={prices.length ? `${formatRwfShort(Math.min(...prices))}–${formatRwfShort(Math.max(...prices)).replace('RWF ', '')}` : '—'} />
          </>
        )}
        <StatCard label="Most booked" icon={TrendingUp} tone="amber" value={mostBooked?.bookings ?? 0} hint={mostBooked?.bookings ? mostBooked.service.name : 'No bookings yet'} />
        <StatCard label="Top earner" icon={Wallet} tone="violet" value={formatRwfShort(top?.revenue ?? 0)} hint={top?.revenue ? top.service.name : 'No revenue yet'} />
      </StatGrid>

      <DataTable
        className="mt-6"
        data={rows}
        columns={columns}
        getRowId={rowId}
        initialSort={{ id: 'revenue', desc: true }}
        searchText={(r) => `${r.service.name} ${r.service.description} ${r.business.name} ${r.service.unit} ${r.service.bedType ?? ''}`}
        searchPlaceholder={roomsView ? 'Search rooms' : 'Search services'}
        exportFileName={roomsView ? 'rooms' : 'services'}
        bulkActions={(selected, clear) => <Button size="sm" variant="danger" onClick={() => setRemoving({ rows: selected, done: clear })}><Trash2 className="h-4 w-4" aria-hidden />Delete selected</Button>}
        rowActions={(r) => (
          <>
            <button onClick={() => open(r)} className="mr-1 inline-grid h-9 w-9 place-items-center rounded-lg text-brand-600 hover:bg-brand-50" aria-label={`Edit ${r.service.name}`}><Pencil className="h-4 w-4" /></button>
            <button onClick={() => setRemoving({ rows: [r] })} className="inline-grid h-9 w-9 place-items-center rounded-lg text-red-600 hover:bg-red-50" aria-label={`Delete ${r.service.name}`}><Trash2 className="h-4 w-4" /></button>
          </>
        )}
        emptyTitle={roomsView ? 'No rooms yet' : 'No services yet'}
        emptyMessage={roomsView ? 'Rooms are added when you create or edit a listing.' : 'Add tours, meals, wellness or products travellers can book.'}
        emptyAction={roomsView ? <ButtonLink to="/business-dashboard/business">Open listings</ButtonLink> : <Button onClick={() => open('new')}>Add your first service</Button>}
      />

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Add a service' : `Edit ${form.name || (roomsView ? 'room' : 'service')}`}
        footer={<><Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={save} loading={saving}>{editing === 'new' ? 'Add' : 'Save changes'}</Button></>}
      >
        <div className="space-y-4">
          {editing === 'new' && businesses.length > 1 && (
            <Select label="Listing" value={form.businessId} onChange={(e) => setForm({ ...form, businessId: e.target.value })} options={businesses.map((b) => ({ value: b.id, label: b.name }))} />
          )}
          <Input label={roomsView ? 'Room name' : 'Service name'} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} placeholder={roomsView ? 'e.g. Deluxe king room' : 'e.g. Twin lakes day hike'} />
          <Input label="Short description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What's included" />
          <div className={roomsView ? undefined : 'grid gap-4 sm:grid-cols-2'}>
            <Input label="Price (RWF)" type="number" min={0} required value={form.priceRwf} onChange={(e) => setForm({ ...form, priceRwf: e.target.value })} error={errors.priceRwf} hint={roomsView ? 'Per night' : undefined} />
            {!roomsView && (
              <Select label="Charged" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} options={serviceUnits.map((u) => ({ value: u, label: u }))} />
            )}
          </div>
          {roomsView && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Guests per room" type="number" min={1} required value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} error={errors.capacity} />
                <Input label="Rooms of this type" type="number" min={1} required value={form.available} onChange={(e) => setForm({ ...form, available: e.target.value })} error={errors.available} hint="Use 1 for a whole house or villa." />
              </div>
              <Input label="Beds" value={form.bedType} onChange={(e) => setForm({ ...form, bedType: e.target.value })} placeholder="e.g. 1 king bed" />
              <Input label="Amenities" value={form.amenities} onChange={(e) => setForm({ ...form, amenities: e.target.value })} placeholder="Breakfast, Wi-Fi, Lake view" hint="Separate with commas." />
            </>
          )}
        </div>
      </Modal>

      <ConfirmModal
        open={!!removing}
        title={removing && removing.rows.length > 1 ? `Delete ${removing.rows.length} ${roomsView ? 'rooms' : 'services'}?` : `Delete “${removing?.rows[0]?.service.name ?? ''}”?`}
        message={removing && removing.rows.length > 1
          ? `These ${roomsView ? 'rooms' : 'services'} will no longer be bookable. Existing bookings are kept.`
          : `“${removing?.rows[0]?.service.name}” will no longer be bookable. Existing bookings are kept.`}
        confirmLabel="Delete"
        loading={saving}
        onCancel={() => setRemoving(null)}
        onConfirm={confirmRemove}
      />
    </>
  );
}
