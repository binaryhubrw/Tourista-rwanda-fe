import { useMemo, useState } from 'react';
import { CalendarCheck, Wallet, Clock, XCircle, Plus } from 'lucide-react';
import type { PaymentMethod } from '@/types';
import { createBooking, getBookings, getBusinesses, getUsers } from '@/services';
import { useAsync, errorMessage } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useQueryFlag } from '@/hooks/useQueryFlag';
import { useToast } from '@/context/ToastContext';
import { Button, DatePicker, ErrorState, Input, Loading, Modal, Select } from '@/components/ui';
import { DataTable, FilterTabs, PageHeader, StatCard, StatGrid } from '@/components/dashboard';
import { BookingViewLink, bookingColumns, bookingSearchText, statusOptions, type StatusFilter } from '../shared/tableColumns';
import { byMonth, periodTrend, sum } from '@/utils/analytics';
import { formatRwf, formatRwfShort, todayIso } from '@/utils/format';
import { addDaysIso, periodNoun, pricingMode, quote } from '@/utils/pricing';
import { paymentReference } from '@/utils/payment';

const columns = bookingColumns(['guest', 'target', 'date', 'units', 'total', 'status', 'payment', 'created'], { detailsBase: '/admin/bookings', linkGuest: true });

export default function AdminBookingsPage() {
  useDocumentTitle('Bookings');
  const toast = useToast();
  const { data, loading, error, reload, setData } = useAsync(async () => {
    const [bookings, businesses, users] = await Promise.all([getBookings(), getBusinesses(), getUsers()]);
    return { bookings, businesses: businesses.filter((b) => b.services.length), customers: users.filter((u) => u.role === 'tourist') };
  });
  const [filter, setFilter] = useState<StatusFilter>('All');
  const [adding, setAdding] = useQueryFlag('new');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ customerId: '', businessId: '', serviceId: '', start: '', end: '', units: '1', people: '2', payment: 'mtn' as PaymentMethod | 'unpaid' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const all = data?.bookings ?? [];
  const list = useMemo(() => all.filter((b) => filter === 'All' || b.status === filter), [all, filter]);

  const business = data?.businesses.find((b) => b.id === form.businessId) ?? data?.businesses[0];
  const service = business?.services.find((s) => s.id === form.serviceId) ?? business?.services[0];
  const customer = data?.customers.find((c) => c.id === form.customerId) ?? data?.customers[0];
  const mode = service ? pricingMode(service.unit) : 'perUnit';
  const ranged = mode === 'stay' || mode === 'rental';
  const q = service ? quote(service, { start: form.start, end: form.end, units: Number(form.units) || 0, people: Number(form.people) || 0 }) : null;

  const save = async () => {
    const e: Record<string, string> = {};
    if (!customer) e.customer = 'Choose a customer.';
    if (!form.start) e.start = 'Choose a date.';
    else if (form.start < todayIso()) e.start = 'Choose today or later.';
    if (ranged && (!form.end || (mode === 'stay' ? form.end <= form.start : form.end < form.start))) e.end = mode === 'stay' ? 'Check-out must be after check-in.' : 'Choose an end date.';
    if (!(Number(form.units) >= 1)) e.units = 'At least 1.';
    if (mode === 'stay' && service?.available && Number(form.units) > service.available) e.units = `Only ${service.available} available.`;
    if (!(Number(form.people) >= 1)) e.people = 'At least 1.';
    setErrors(e);
    if (Object.keys(e).length || !business || !service || !customer || !q) return;
    setSaving(true);
    try {
      const created = await createBooking(
        {
          userId: customer.id, customerName: customer.name, customerEmail: customer.email, customerPhone: customer.phone ?? '',
          targetId: business.id, targetType: 'business', targetName: business.name, businessId: business.id,
          serviceId: service.id, serviceName: service.name, date: form.start, endDate: ranged ? form.end : undefined, nights: ranged ? q.periods : undefined,
          units: q.units, unitPriceRwf: service.priceRwf, people: Number(form.people), totalRwf: q.total, notes: 'Booked by an admin',
        },
        form.payment === 'unpaid' ? undefined : { method: form.payment, status: 'Paid', account: form.payment === 'card' ? 'Card (at desk)' : customer.phone ?? 'Mobile money', reference: paymentReference(form.payment), amountRwf: q.total, paidAt: new Date().toISOString() },
      );
      setData((d) => d && { ...d, bookings: [created, ...d.bookings] });
      toast.success(`Booking ${created.id.toUpperCase()} created for ${customer.name}${created.payment ? ' and marked as paid' : '. It waits for payment'}.`);
      setAdding(false);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading) return <Loading />;

  const paid = all.filter((b) => b.payment?.status === 'Paid');
  const canceled = all.filter((b) => b.status === 'Canceled').length;
  const valueTrend = periodTrend(paid, (b) => b.createdAt, (b) => b.totalRwf, 30);
  const monthly = byMonth(all, (b) => b.createdAt, { Confirmed: (b) => +(b.status === 'Confirmed'), Pending: (b) => +(b.status === 'Pending'), Canceled: (b) => +(b.status === 'Canceled') });

  return (
    <>
      <PageHeader title="Bookings" intro="Every booking made through the platform. A booking is confirmed once it's paid." action={<Button onClick={() => { setErrors({}); setForm((f) => ({ ...f, start: '', end: '' })); setAdding(true); }} disabled={loading}><Plus className="h-4 w-4" aria-hidden />New booking</Button>} />

      <StatGrid>
        <StatCard label="Total bookings" icon={CalendarCheck} value={all.length} sparkline={monthly.map((m) => m.Confirmed + m.Pending + m.Canceled)} />
        <StatCard label="Payments (30 days)" icon={Wallet} tone="violet" value={formatRwfShort(valueTrend.current)} trend={{ value: valueTrend.change, label: 'vs previous 30 days' }} hint={`${formatRwfShort(sum(paid, (b) => b.totalRwf))} all time`} />
        <StatCard label="Awaiting payment" icon={Clock} tone="amber" value={all.filter((b) => b.status === 'Pending').length} />
        <StatCard label="Cancellation rate" icon={XCircle} tone="rose" value={all.length ? `${Math.round((canceled / all.length) * 100)}%` : '—'} hint={`${canceled} canceled, refunds issued`} />
      </StatGrid>

      <DataTable
        className="mt-6"
        data={list}
        columns={columns}
        getRowId={(b) => b.id}
        initialSort={{ id: 'created', desc: true }}
        searchText={bookingSearchText}
        searchPlaceholder="Search guest, place, ref or payment"
        filters={<FilterTabs label="Filter by status" value={filter} onChange={setFilter} options={statusOptions(all)} />}
        exportFileName="platform-bookings"
        rowActions={(b) => <BookingViewLink to={`/admin/bookings/${b.id}`} />}
        emptyTitle="No bookings"
        emptyMessage="Bookings made by travellers will appear here."
      />

      <Modal open={adding && !!data} onClose={() => setAdding(false)} title="New booking" size="lg" footer={<><Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button><Button onClick={save} loading={saving}>Create booking{q && q.total > 0 ? ` · ${formatRwf(q.total)}` : ''}</Button></>}>
        {data && business && service && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><Select label="Customer" value={customer?.id ?? ''} onChange={(e) => setForm({ ...form, customerId: e.target.value })} options={data.customers.map((c) => ({ value: c.id, label: `${c.name} · ${c.email}` }))} error={errors.customer} /></div>
            <Select label="Branch" value={business.id} onChange={(e) => setForm({ ...form, businessId: e.target.value, serviceId: '' })} options={data.businesses.map((b) => ({ value: b.id, label: b.name }))} />
            <Select label={mode === 'stay' ? 'Room' : 'Service'} value={service.id} onChange={(e) => setForm({ ...form, serviceId: e.target.value })} options={business.services.map((s) => ({ value: s.id, label: `${s.name} · ${formatRwf(s.priceRwf)} ${s.unit}` }))} />
            <DatePicker
              label={ranged ? (mode === 'stay' ? 'Check-in' : 'From') : 'Date'}
              required
              min={todayIso()}
              value={form.start}
              onChange={(iso) => setForm({ ...form, start: iso, end: mode === 'stay' && iso && (!form.end || form.end <= iso) ? addDaysIso(iso, 1) : form.end })}
              error={errors.start}
            />
            {ranged ? (
              <DatePicker
                label={mode === 'stay' ? 'Check-out' : 'To'}
                required
                min={form.start ? (mode === 'stay' ? addDaysIso(form.start, 1) : form.start) : todayIso()}
                value={form.end}
                onChange={(iso) => setForm({ ...form, end: iso })}
                error={errors.end}
              />
            ) : <span className="hidden sm:block" />}
            {mode !== 'perPerson' && <Input label={mode === 'stay' ? 'Rooms' : 'Quantity'} type="number" min={1} max={service.available} value={form.units} onChange={(e) => setForm({ ...form, units: e.target.value })} error={errors.units} hint={service.available ? `${service.available} available` : undefined} />}
            <Input label={mode === 'stay' ? 'Guests' : 'People'} type="number" min={1} value={form.people} onChange={(e) => setForm({ ...form, people: e.target.value })} error={errors.people} />
            <div className="sm:col-span-2"><Select label="Payment" value={form.payment} onChange={(e) => setForm({ ...form, payment: e.target.value as typeof form.payment })} options={[
              { value: 'mtn', label: 'Paid by MTN MoMo' }, { value: 'airtel', label: 'Paid by Airtel Money' }, { value: 'card', label: 'Paid by card' }, { value: 'unpaid', label: 'Not paid yet (customer pays online)' },
            ]} /></div>
            {q && q.total > 0 && (
              <p className="rounded-xl bg-brand-50 px-4 py-3 text-sm text-ink sm:col-span-2">
                {formatRwf(service.priceRwf)}{ranged ? ` × ${q.periods} ${periodNoun(mode, q.periods)}` : ''} × {q.units} = <strong>{formatRwf(q.total)}</strong>
              </p>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
