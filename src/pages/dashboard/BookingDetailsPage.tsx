import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { getBookingById, getBusinessesByOwner, getPayoutForBusiness, updateBookingStatus } from '@/services';
import { confirmHostReceivedPayment, hostDecideBooking, submitOfflinePayment } from '@/services/bookingService';
import { useAsync, errorMessage } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useAuth, dashboardPathFor } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Button, ButtonLink, ErrorState, Loading, Modal } from '@/components/ui';
import { BookingStatusBadge, bookingStatusLabel, PageHeader } from '@/components/dashboard';
import { OfflinePaymentForm } from '@/components/payment/OfflinePaymentForm';
import { bookingLines } from '@/utils/availability';
import { platesPhrase } from '@/utils/catalog';
import { formatDate, formatRwf } from '@/utils/format';
import { paidToward, paymentMethodLabel, remainingDue } from '@/utils/payment';

const targetHref = (type: string, id: string) => (type === 'experience' ? `/experiences/${id}` : type === 'location' ? `/explore?location=${id}#explore-listings` : `/businesses/${id}`);

export default function BookingDetailsPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { data: booking, loading, error, reload, setData } = useAsync(async () => {
    const booking = await getBookingById(id);
    if (!user) throw { message: 'Booking was not found.', status: 404 };
    if (user.role === 'tourist' && booking.userId !== user.id) throw { message: 'Booking was not found.', status: 404 };
    if (user.role === 'business_owner' || user.role === 'staff') {
      const mine = await getBusinessesByOwner(user.ownerId ?? user.id);
      if (!mine.some((business) => business.id === booking.businessId || business.id === booking.targetId)) throw { message: 'Booking was not found.', status: 404 };
    }
    return booking;
  }, [id, user?.id, user?.role]);
  const payout = useAsync(() => (booking?.businessId ? getPayoutForBusiness(booking.businessId) : Promise.resolve(null)), [booking?.businessId]);
  const [paying, setPaying] = useState(false);
  const [busy, setBusy] = useState(false);
  useDocumentTitle(booking ? `Booking ${booking.id.toUpperCase()}` : 'Booking');

  if (loading) return <Loading label="Loading booking" />;
  if (error || !booking || !user) return <ErrorState message={error ?? 'Booking was not found.'} onRetry={reload} />;

  const lines = bookingLines(booking);
  const back = `${dashboardPathFor(user.role)}/bookings`;
  const paid = paidToward(booking);
  const remaining = remainingDue(booking);
  const canPay = user.role === 'tourist' && remaining > 0 && ['AwaitingPayment', 'PaymentReview', 'Confirmed'].includes(booking.status);
  const canCancel = !['Canceled', 'Declined', 'Refunded', 'Confirmed', 'RefundPending'].includes(booking.status) && user.role !== 'admin';
  const host = user.role === 'business_owner' || user.role === 'staff';

  const onPaid = async (input: Parameters<typeof submitOfflinePayment>[1]) => {
    await submitOfflinePayment(booking.id, input);
    setPaying(false);
    toast.success('Proof sent. The host will confirm when the money arrives.');
    navigate(`${dashboardPathFor(user.role)}/payments`);
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
      <PageHeader title={booking.targetName} intro={`Reference ${booking.id.toUpperCase()}`} action={<BookingStatusBadge status={booking.status} />} />

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="font-display text-xl font-bold text-ink">What was booked</h2>
          <ul className="mt-4 divide-y divide-slate-100">
            {lines.map((line) => (
              <li key={line.serviceId} className="flex items-baseline justify-between gap-4 py-3">
                <div>
                  <p className="font-semibold text-ink">{line.serviceName}</p>
                  <p className="text-sm text-slate-500">{line.units} × {formatRwf(line.unitPriceRwf)}</p>
                  {line.plateNumbers?.length ? <p className="mt-1 text-sm font-semibold tracking-wide text-ink">Plate {platesPhrase(line.plateNumbers)}</p> : null}
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
          <Link to={targetHref(booking.targetType, booking.targetId)} className="mt-4 inline-flex text-sm font-semibold text-brand-600 hover:underline">Open the branch</Link>
        </section>

        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="font-display text-xl font-bold text-ink">Guest</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Name</dt><dd className="font-semibold text-ink">{user.role === 'admin' ? <Link to={`/admin/users/${booking.userId}`} className="text-brand-700 hover:underline">{booking.customerName}</Link> : booking.customerName}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Email</dt><dd className="break-all text-right font-semibold text-ink">{booking.customerEmail}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Phone</dt><dd className="font-semibold text-ink">{booking.customerPhone || '—'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Booked on</dt><dd className="font-semibold text-ink">{formatDate(booking.createdAt)}</dd></div>
            </dl>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="font-display text-xl font-bold text-ink">Payment</h2>
            {booking.payment ? (
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Status</dt><dd className="font-semibold text-ink">{booking.payment.ledger ?? booking.payment.status}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Method</dt><dd className="font-semibold text-ink">{paymentMethodLabel[booking.payment.method]}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Sender</dt><dd className="font-semibold text-ink">{booking.payment.senderName ?? booking.payment.account}</dd></div>
                {booking.payment.sentTo && (
                  <div className="flex justify-between gap-4"><dt className="text-slate-500">Sent to</dt><dd className="text-right font-semibold text-ink">{booking.payment.sentToLabel ?? booking.payment.sentTo}<span className="block text-xs font-normal text-slate-500">{booking.payment.sentToLabel ? booking.payment.sentTo : ''}</span></dd></div>
                )}
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Reference</dt><dd className="font-semibold text-ink">{booking.payment.reference}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Amount</dt><dd className="font-semibold text-ink">{formatRwf(booking.payment.amountRwf)} of {formatRwf(booking.totalRwf)}{remaining > 0 ? ` · ${formatRwf(remaining)} left` : ''} on {formatDate(booking.payment.paidAt)}</dd></div>
              </dl>
            ) : (
              <p className="mt-3 text-sm text-slate-600">{bookingStatusLabel[booking.status]}. Payment is off-platform after the host approves.</p>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              {canPay && <Button onClick={() => setPaying(true)}>{paid ? 'Add another payment' : 'Proceed to payment'}</Button>}
              {host && booking.status === 'Pending' && (
                <>
                  <Button onClick={async () => { setBusy(true); try { setData(await hostDecideBooking(booking.id, true)); toast.success('Approved. The traveller has two hours to pay at least 30%.'); } catch (err) { toast.error(errorMessage(err)); } finally { setBusy(false); } }} loading={busy}>Approve</Button>
                  <Button variant="danger" onClick={async () => { setBusy(true); try { setData(await hostDecideBooking(booking.id, false)); toast.success('Booking declined.'); } catch (err) { toast.error(errorMessage(err)); } finally { setBusy(false); } }} loading={busy}>Decline</Button>
                </>
              )}
              {host && (booking.status === 'PaymentReview' || (booking.payment?.transfers?.some((t) => t.status === 'Pending'))) && (
                <Button onClick={async () => { setBusy(true); try { setData(await confirmHostReceivedPayment(booking.id)); toast.success('Marked as paid.'); } catch (err) { toast.error(errorMessage(err)); } finally { setBusy(false); } }} loading={busy}>Confirm payment received</Button>
              )}
              {(canPay || booking.payment) && <ButtonLink to={`${dashboardPathFor(user.role)}/payments/${booking.id}`} variant="secondary">Payment details</ButtonLink>}
              {canCancel && <Button variant="danger" onClick={cancel} loading={busy}>Cancel booking</Button>}
            </div>
          </section>
        </div>
      </div>

      <Modal open={paying} onClose={() => setPaying(false)} title={paid ? `Add a payment for ${booking.targetName}` : `Pay for ${booking.targetName}`} size="lg">
        <p className="mb-5 rounded-xl bg-brand-50 px-4 py-3 text-sm text-ink">
          {booking.serviceName} · {formatDate(booking.date)} · <strong>{formatRwf(booking.totalRwf)}</strong>
          {paid ? ` · ${formatRwf(remaining)} remaining` : ` · at least 30% now`}
        </p>
        <OfflinePaymentForm amountRwf={booking.totalRwf} alreadyPaid={paid} payout={payout.data} onSubmit={onPaid} />
      </Modal>
    </>
  );
}
