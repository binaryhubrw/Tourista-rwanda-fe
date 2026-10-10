import { useMemo, useState } from 'react';
import { CalendarCheck, CalendarClock, CreditCard, Wallet, XCircle } from 'lucide-react';
import type { Booking, Payment } from '@/types';
import { getBookings, payBooking, updateBookingStatus } from '@/services';
import { useAsync, errorMessage } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Button, ButtonLink, ConfirmModal, ErrorState, Modal } from '@/components/ui';
import { DataTable, FilterTabs, PageHeader, StatCard, StatGrid } from '@/components/dashboard';
import { PaymentForm } from '@/components/payment/PaymentForm';
import { BookingViewLink, bookingColumns, bookingSearchText, statusOptions, type StatusFilter } from '../shared/tableColumns';
import { sum } from '@/utils/analytics';
import { formatDate, formatRwf, formatRwfShort, todayIso } from '@/utils/format';

const columns = bookingColumns(['target', 'date', 'units', 'total', 'status', 'payment', 'created'], { detailsBase: '/dashboard/bookings' });
const canCancel = (b: Booking) => b.status !== 'Canceled' && b.date >= todayIso();
const needsPayment = (b: Booking) => b.status === 'Pending' && !b.payment && b.date >= todayIso();

export default function BookingsPage() {
  useDocumentTitle('My bookings');
  const { user } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload, setData } = useAsync(() => getBookings({ userId: user!.id }), [user?.id]);
  const [filter, setFilter] = useState<StatusFilter>('All');
  const [cancelling, setCancelling] = useState<{ rows: Booking[]; done?: () => void } | null>(null);
  const [paying, setPaying] = useState<Booking | null>(null);
  const [busy, setBusy] = useState(false);

  const all = data ?? [];
  const list = useMemo(() => all.filter((b) => filter === 'All' || b.status === filter), [all, filter]);
  const upcoming = all.filter((b) => b.status === 'Confirmed' && b.date >= todayIso()).sort((a, b) => a.date.localeCompare(b.date));
  const unpaid = all.filter(needsPayment);

  const cancel = async () => {
    if (!cancelling) return;
    setBusy(true);
    try {
      const updated = await Promise.all(cancelling.rows.map((b) => updateBookingStatus(b.id, 'Canceled')));
      const byId = new Map(updated.map((b) => [b.id, b]));
      setData((rows) => rows?.map((b) => byId.get(b.id) ?? b));
      const refunded = updated.filter((b) => b.payment?.status === 'Refunded');
      toast.success(
        `${updated.length > 1 ? `${updated.length} bookings` : 'Booking'} canceled.` +
        (refunded.length ? ` ${formatRwf(sum(refunded, (b) => b.totalRwf))} refunded to your original payment method.` : ''),
      );
      cancelling.done?.();
      setCancelling(null);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const onPaid = async (payment: Payment) => {
    if (!paying) return;
    try {
      const updated = await payBooking(paying.id, payment);
      setData((rows) => rows?.map((b) => (b.id === updated.id ? updated : b)));
      toast.success(`Paid ${formatRwf(payment.amountRwf)}. ${paying.targetName} is confirmed.`);
      setPaying(null);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <>
      <PageHeader title="Bookings" intro="Bookings are confirmed once they're paid. Cancel an upcoming booking to get a refund." action={<ButtonLink to="/explore" variant="secondary">Book something new</ButtonLink>} />

      <StatGrid>
        <StatCard label="All bookings" icon={CalendarCheck} loading={loading} value={all.length} hint={`${all.filter((b) => b.status === 'Confirmed').length} confirmed`} />
        <StatCard label="Upcoming stays & trips" icon={CalendarClock} tone="teal" loading={loading} value={upcoming.length} hint={upcoming[0] ? `Next: ${upcoming[0].targetName}, ${formatDate(upcoming[0].date)}` : 'Nothing confirmed yet'} />
        <StatCard label="Awaiting payment" icon={CreditCard} tone="amber" loading={loading} value={unpaid.length} hint={unpaid.length ? `${formatRwf(sum(unpaid, (b) => b.totalRwf))} to pay` : 'Nothing to pay'} />
        <StatCard label="Total paid" icon={Wallet} tone="violet" loading={loading} value={formatRwfShort(sum(all.filter((b) => b.payment?.status === 'Paid'), (b) => b.totalRwf))} hint="Refunds excluded" />
      </StatGrid>

      <DataTable
        className="mt-6"
        data={list}
        loading={loading}
        columns={columns}
        getRowId={(b) => b.id}
        initialSort={{ id: 'date', desc: true }}
        searchText={bookingSearchText}
        searchPlaceholder="Search bookings"
        filters={<FilterTabs label="Filter by status" value={filter} onChange={setFilter} options={statusOptions(all)} />}
        exportFileName="my-bookings"
        bulkActions={(rows, clear) => {
          const cancellable = rows.filter(canCancel);
          return (
            <Button size="sm" variant="danger" disabled={!cancellable.length} onClick={() => setCancelling({ rows: cancellable, done: clear })}>
              <XCircle className="h-4 w-4" aria-hidden />Cancel {cancellable.length || ''} selected
            </Button>
          );
        }}
        rowActions={(b) => (
          <div className="flex items-center justify-end gap-2">
            <BookingViewLink to={`/dashboard/bookings/${b.id}`} />
            {needsPayment(b) && <Button size="sm" onClick={() => setPaying(b)}><CreditCard className="h-4 w-4" aria-hidden />Pay now</Button>}
            {canCancel(b) && <button onClick={() => setCancelling({ rows: [b] })} className="text-sm font-semibold text-red-600 hover:underline">Cancel</button>}
          </div>
        )}
        emptyTitle={filter === 'All' ? 'No bookings yet' : `No ${filter.toLowerCase()} bookings`}
        emptyMessage="When you book a stay, guide or experience, it will appear here."
      />

      <Modal open={!!paying} onClose={() => setPaying(null)} title={paying ? `Pay for ${paying.targetName}` : 'Pay'} size="lg">
        {paying && (
          <>
            <p className="mb-5 rounded-xl bg-brand-50 px-4 py-3 text-sm text-ink">
              {paying.serviceName} · {formatDate(paying.date)}{paying.endDate && ` → ${formatDate(paying.endDate)}`} · <strong>{formatRwf(paying.totalRwf)}</strong>
            </p>
            <PaymentForm amountRwf={paying.totalRwf} defaultPhone={paying.customerPhone} onPaid={onPaid} />
          </>
        )}
      </Modal>

      <ConfirmModal
        open={!!cancelling}
        title={cancelling && cancelling.rows.length > 1 ? `Cancel ${cancelling.rows.length} bookings?` : 'Cancel this booking?'}
        message={
          (cancelling && cancelling.rows.length > 1 ? 'These bookings will be canceled and each host notified.' : `Your booking for ${cancelling?.rows[0]?.targetName} on ${cancelling?.rows[0] ? formatDate(cancelling.rows[0].date) : ''} will be canceled and the host notified.`) +
          (cancelling?.rows.some((b) => b.payment?.status === 'Paid') ? ' Payments are refunded to the card or mobile money account you paid with.' : '')
        }
        confirmLabel="Cancel booking"
        loading={busy}
        onConfirm={cancel}
        onCancel={() => setCancelling(null)}
      />
    </>
  );
}
