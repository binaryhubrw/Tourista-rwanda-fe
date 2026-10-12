import { useMemo, useState } from 'react';
import { X, CalendarCheck, Clock, Wallet, BedDouble } from 'lucide-react';
import type { Booking } from '@/types';
import { updateBookingStatus } from '@/services';
import { errorMessage } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useToast } from '@/context/ToastContext';
import { Button, ButtonLink, ConfirmModal, ErrorState } from '@/components/ui';
import { DataTable, FilterTabs, PageHeader, StatCard, StatGrid } from '@/components/dashboard';
import { BookingViewLink, bookingColumns, bookingSearchText, statusOptions, type StatusFilter } from '../shared/tableColumns';
import { sum } from '@/utils/analytics';
import { formatRwfShort, todayIso } from '@/utils/format';
import { useOwnerActivity } from './useOwnerBusinesses';
import { useAuth } from '@/context/AuthContext';

/** Upcoming bookings that can still be declined (paid ones are refunded). */
const canDecline = (b: Booking) => b.status !== 'Canceled' && b.date >= todayIso();

export default function BusinessBookingsPage() {
  useDocumentTitle('Bookings');
  const toast = useToast();
  const { user } = useAuth();
  const { data, loading, error, reload, setData } = useOwnerActivity();
  const [filter, setFilter] = useState<StatusFilter>('All');
  const [declining, setDeclining] = useState<{ rows: Booking[]; done?: () => void } | null>(null);
  const [busy, setBusy] = useState(false);

  const multipleListings = (data?.businesses.length ?? 0) > 1;
  const columns = useMemo(() => bookingColumns(multipleListings ? ['guest', 'target', 'service', 'date', 'units', 'total', 'status', 'payment'] : ['guest', 'service', 'date', 'units', 'total', 'status', 'payment'], { detailsBase: '/business-dashboard/bookings' }), [multipleListings]);
  const all = data?.bookings ?? [];
  const list = useMemo(() => all.filter((b) => filter === 'All' || b.status === filter), [all, filter]);
  const pending = all.filter((b) => b.status === 'Pending');
  const today = todayIso();
  const nightsBooked = sum(all.filter((b) => b.status === 'Confirmed' && b.date >= today && b.nights), (b) => (b.nights ?? 0) * (b.units ?? 1));

  const decline = async () => {
    if (!declining) return;
    setBusy(true);
    try {
      const updated = await Promise.all(declining.rows.map((b) => updateBookingStatus(b.id, 'Canceled')));
      const byId = new Map(updated.map((b) => [b.id, b]));
      setData((d) => d && { ...d, bookings: d.bookings.map((b) => byId.get(b.id) ?? b) });
      const refunds = updated.filter((b) => b.payment?.status === 'Refunded').length;
      toast.success(`${updated.length > 1 ? `${updated.length} bookings` : 'Booking'} declined.${refunds ? ` ${refunds} guest${refunds > 1 ? 's' : ''} refunded.` : ''}`);
      declining.done?.();
      setDeclining(null);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (error) return <ErrorState message={error} onRetry={reload} />;

  if (!loading && !data?.businesses.length) {
    return (
      <>
        <PageHeader title="Bookings" />
        <StatGrid><StatCard label="Bookings" icon={CalendarCheck} value={0} hint="Add a branch to start receiving bookings" /></StatGrid>
        {user?.role === 'business_owner' ? <div className="mt-6"><ButtonLink to="/business-dashboard/business/new">Add branch</ButtonLink></div> : null}
      </>
    );
  }

  return (
    <>
      <PageHeader title="Bookings" intro="Approve or decline new requests. Once you approve, the guest has two hours to pay at least 30%. Confirm when their transfer arrives." />

      <StatGrid>
        <StatCard label="All bookings" icon={CalendarCheck} loading={loading} value={all.length} hint={`${all.filter((b) => b.status === 'Confirmed').length} confirmed and paid`} />
        <StatCard label="Awaiting your decision" icon={Clock} tone="teal" loading={loading} value={pending.length} hint={pending.length ? 'Approve or decline from the booking' : 'Nothing waiting'} />
        <StatCard label="Paid revenue" icon={Wallet} tone="amber" loading={loading} value={formatRwfShort(sum(all.filter((b) => b.payment?.status === 'Paid'), (b) => b.totalRwf))} hint="Card, MTN MoMo and Airtel Money" />
        <StatCard label="Room-nights ahead" icon={BedDouble} tone="violet" loading={loading} value={nightsBooked} hint="Confirmed upcoming stays" />
      </StatGrid>

      <DataTable
        className="mt-6"
        data={list}
        loading={loading}
        columns={columns}
        getRowId={(b) => b.id}
        initialSort={{ id: 'date', desc: true }}
        searchText={bookingSearchText}
        searchPlaceholder="Search guest, room, ref or payment"
        filters={<FilterTabs label="Filter by status" value={filter} onChange={setFilter} options={statusOptions(all)} />}
        exportFileName="business-bookings"
        bulkActions={(rows, clear) => {
          const open = rows.filter(canDecline);
          return <Button size="sm" variant="danger" disabled={!open.length} onClick={() => setDeclining({ rows: open, done: clear })}><X className="h-4 w-4" aria-hidden />Decline {open.length || ''}</Button>;
        }}
        rowActions={(b) => (
          <div className="flex items-center justify-end gap-2">
            <BookingViewLink to={`/business-dashboard/bookings/${b.id}`} />
            {canDecline(b) && <button onClick={() => setDeclining({ rows: [b] })} className="text-sm font-semibold text-red-600 hover:underline">Decline</button>}
          </div>
        )}
        emptyTitle={filter === 'All' ? 'No bookings yet' : `No ${filter.toLowerCase()} bookings`}
        emptyMessage="Bookings from travellers will appear here."
      />

      <ConfirmModal
        open={!!declining}
        title={declining && declining.rows.length > 1 ? `Decline ${declining.rows.length} bookings?` : 'Decline this booking?'}
        message="Guests are notified, and any payment is refunded in full to the card or mobile money account they used."
        confirmLabel="Decline"
        loading={busy}
        onConfirm={decline}
        onCancel={() => setDeclining(null)}
      />
    </>
  );
}
