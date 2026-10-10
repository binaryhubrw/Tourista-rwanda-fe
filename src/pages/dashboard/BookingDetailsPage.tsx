import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import type { Payment } from '@/types';
import { getBookingById, getBusinessesByOwner, payBooking, updateBookingStatus } from '@/services';
import { useAsync, errorMessage } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useAuth, dashboardPathFor } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Badge, Button, ErrorState, LoadingSpinner, Modal } from '@/components/ui';
import { PageHeader } from '@/components/dashboard';
import { PaymentForm } from '@/components/payment/PaymentForm';
import { bookingLines } from '@/utils/availability';
import { formatDate, formatRwf, todayIso } from '@/utils/format';
import { paymentMethodLabel } from '@/utils/payment';

const targetHref = (type: string, id: string) => (type === 'experience' ? `/experiences/${id}` : type === 'location' ? `/explore?location=${id}#explore-listings` : `/businesses/${id}`);

export default function BookingDetailsPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const { data: booking, loading, error, reload, setData } = useAsync(async () => {
    const booking = await getBookingById(id);
    if (!user) throw { message: 'Booking was not found.', status: 404 };
    if (user.role === 'tourist' && booking.userId !== user.id) throw { message: 'Booking was not found.', status: 404 };
    if (user.role === 'business_owner') {
      const mine = await getBusinessesByOwner(user.id);
      if (!mine.some((business) => business.id === booking.businessId || business.id === booking.targetId)) throw { message: 'Booking was not found.', status: 404 };
    }
    return booking;
  }, [id, user?.id, user?.role]);
  const [paying, setPaying] = useState(false);
  const [busy, setBusy] = useState(false);
  useDocumentTitle(booking ? `Booking ${booking.id.toUpperCase()}` : 'Booking');

  if (loading) return <LoadingSpinner label="Loading booking" />;
  if (error || !booking || !user) return <ErrorState message={error ?? 'Booking was not found.'} onRetry={reload} />;

  const lines = bookingLines(booking);
  const back = `${dashboardPathFor(user.role)}/bookings`;
  const canPay = user.role === 'tourist' && booking.status === 'Pending' && !booking.payment && booking.date >= todayIso();
  const canCancel = booking.status !== 'Canceled' && booking.date >= todayIso() && user.role !== 'admin';

  const onPaid = async (payment: Payment) => {
    try {
      const updated = await payBooking(booking.id, payment);
      setData(updated);
      setPaying(false);
      toast.success('Payment received. The booking is confirmed.');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const cancel = async () => {
    setBusy(true);
    try {
      const updated = await updateBookingStatus(booking.id, 'Canceled');
      setData(updated);
      toast.success(updated.payment?.status === 'Refunded' ? 'Booking canceled and the payment was refunded.' : 'Booking canceled.');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Link to={back} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline"><ChevronLeft className="h-4 w-4" aria-hidden />All bookings</Link>
      <PageHeader title={booking.targetName} intro={`Reference ${booking.id.toUpperCase()}`} action={<Badge tone={booking.status === 'Confirmed' ? 'success' : booking.status === 'Canceled' ? 'neutral' : 'warning'}>{booking.status}</Badge>} />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="font-display text-xl font-bold text-ink">What was booked</h2>
          <ul className="mt-4 divide-y divide-slate-100">
            {lines.map((line) => (
              <li key={line.serviceId} className="flex items-baseline justify-between gap-4 py-3">
                <div>
                  <p className="font-semibold text-ink">{line.serviceName}</p>
                  <p className="text-sm text-slate-500">{line.units} × {formatRwf(line.unitPriceRwf)}</p>
                </div>
                <p className="font-semibold text-ink">{formatRwf(line.lineTotalRwf)}</p>
              </li>
            ))}
          </ul>
          <dl className="mt-2 space-y-2 border-t border-slate-100 pt-4 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Dates</dt><dd className="font-semibold text-ink">{formatDate(booking.date)}{booking.endDate ? ` → ${formatDate(booking.endDate)}` : ''}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Guests</dt><dd className="font-semibold text-ink">{booking.people}</dd></div>
            {booking.notes && <div className="flex justify-between gap-4"><dt className="text-slate-500">Notes</dt><dd className="max-w-sm text-right text-ink">{booking.notes}</dd></div>}
            <div className="flex justify-between gap-4 text-base"><dt className="font-semibold text-ink">Total</dt><dd className="font-display text-xl font-bold text-ink">{formatRwf(booking.totalRwf)}</dd></div>
          </dl>
          <Link to={targetHref(booking.targetType, booking.targetId)} className="mt-4 inline-flex text-sm font-semibold text-brand-600 hover:underline">Open the listing</Link>
        </section>

        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="font-display text-xl font-bold text-ink">Guest</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Name</dt><dd className="font-semibold text-ink">{user.role === 'admin' ? <Link to={`/admin/users/${booking.userId}`} className="text-brand-700 hover:underline">{booking.customerName}</Link> : booking.customerName}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Email</dt><dd className="font-semibold text-ink">{booking.customerEmail}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Phone</dt><dd className="font-semibold text-ink">{booking.customerPhone || '—'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Booked on</dt><dd className="font-semibold text-ink">{formatDate(booking.createdAt)}</dd></div>
            </dl>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="font-display text-xl font-bold text-ink">Payment</h2>
            {booking.payment ? (
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Status</dt><dd className="font-semibold text-ink">{booking.payment.status}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Method</dt><dd className="font-semibold text-ink">{paymentMethodLabel[booking.payment.method]}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Account</dt><dd className="font-semibold text-ink">{booking.payment.account}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Reference</dt><dd className="font-semibold text-ink">{booking.payment.reference}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Paid</dt><dd className="font-semibold text-ink">{formatRwf(booking.payment.amountRwf)} on {formatDate(booking.payment.paidAt)}</dd></div>
              </dl>
            ) : (
              <p className="mt-3 text-sm text-slate-600">This booking is not confirmed yet. It stays pending until the guest pays.</p>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              {canPay && <Button onClick={() => setPaying(true)}>Pay now</Button>}
              {canCancel && <Button variant="danger" onClick={cancel} loading={busy}>Cancel booking</Button>}
            </div>
          </section>
        </div>
      </div>

      <Modal open={paying} onClose={() => setPaying(false)} title={`Pay for ${booking.targetName}`} size="lg">
        <p className="mb-5 rounded-xl bg-brand-50 px-4 py-3 text-sm text-ink">
          {booking.serviceName} · {formatDate(booking.date)} · <strong>{formatRwf(booking.totalRwf)}</strong>
        </p>
        <PaymentForm amountRwf={booking.totalRwf} defaultPhone={booking.customerPhone} onPaid={onPaid} />
      </Modal>
    </>
  );
}
