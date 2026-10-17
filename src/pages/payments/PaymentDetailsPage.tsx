import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, ChevronLeft, Clock, RotateCcw, ShieldCheck } from 'lucide-react';
import { getBookingById, getPayoutForBusiness, getRefunds } from '@/services';
import { confirmHostReceivedPayment, submitOfflinePayment } from '@/services/bookingService';
import { minDue } from '@/utils/lifecycle';
import { useAsync, errorMessage } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { isHostRole, isTravellerQuery } from '@/hooks/useViewerMode';
import { useAuth, dashboardPathFor } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Badge, Button, ButtonLink, ErrorState, Loading } from '@/components/ui';
import { BookingStatusBadge, PageHeader, PaymentLedgerBadge } from '@/components/dashboard';
import { InvoiceActions } from '@/components/payment/InvoiceActions';
import { OfflinePaymentForm } from '@/components/payment/OfflinePaymentForm';
import { AirtelLogo, CardIcon, MtnLogo } from '@/components/payment/PaymentIcons';
import { bookingLines } from '@/utils/availability';
import { formatDate, formatRwf } from '@/utils/format';
import { paidToward, paymentDisplayStatus, paymentMethodLabel, paymentTransfers, remainingDue } from '@/utils/payment';
import { refundIsClosed } from '@/utils/refund';

function remainingLabel(iso?: string) {
  if (!iso) return '';
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'Window closed';
  const m = Math.ceil(ms / 60_000);
  const h = Math.floor(m / 60);
  return h ? `${h}h ${m % 60}m left` : `${m} min left`;
}

function MethodMark({ method }: { method?: string }) {
  if (method === 'mtn') return <MtnLogo className="h-8 w-12 rounded-md" />;
  if (method === 'airtel') return <AirtelLogo className="h-8 w-12 rounded-md" />;
  return <CardIcon className="h-8 w-12" />;
}

export default function PaymentDetailsPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const base = dashboardPathFor(user!.role);
  const asTraveller = user?.role === 'tourist' || (isHostRole(user?.role) && isTravellerQuery(searchParams));
  const { data, loading, error, reload } = useAsync(async () => {
    const [booking, refunds] = await Promise.all([getBookingById(id), getRefunds(asTraveller ? 'traveller' : undefined)]);
    return { booking, refunds };
  }, [id, user?.id, user?.role, asTraveller]);
  const booking = data?.booking;
  const payout = useAsync(() => {
    const bid = booking?.businessId ?? (booking?.targetType === 'business' ? booking.targetId : undefined);
    return bid ? getPayoutForBusiness(bid) : Promise.resolve(null);
  }, [booking?.businessId, booking?.targetType, booking?.targetId]);
  const [busy, setBusy] = useState(false);
  const [, setTick] = useState(0);
  useDocumentTitle(booking ? `Payment ${booking.payment?.reference ?? booking.id}` : 'Payment');

  useEffect(() => {
    if (booking?.status !== 'AwaitingPayment') return;
    const t = window.setInterval(() => setTick((n) => n + 1), 30_000);
    return () => window.clearInterval(t);
  }, [booking?.status]);

  if (loading) return <Loading label="Loading payment" />;
  if (error || !booking || !user) return <ErrorState message={error ?? 'Payment was not found.'} onRetry={reload} />;

  const refunds = data?.refunds ?? [];
  const refund = refunds.find((r) => r.bookingId === booking.id && !refundIsClosed(r.status))
    ?? refunds.find((r) => r.bookingId === booking.id);
  const display = paymentDisplayStatus(booking, refunds);
  const host = isHostRole(user.role) && !asTraveller;
  const tourist = asTraveller;
  const lines = bookingLines(booking);
  const due = minDue(booking.totalRwf);
  const paid = paidToward(booking);
  const remaining = remainingDue(booking);
  const transfers = paymentTransfers(booking.payment);
  const pendingProof = transfers.some((t) => t.status === 'Pending');
  const canRefund = tourist && display === 'approved';
  const canPay = tourist && remaining > 0 && ['AwaitingPayment', 'PaymentReview', 'Confirmed'].includes(booking.status);

  const run = async (fn: () => Promise<unknown> | unknown, ok: string) => {
    setBusy(true);
    try {
      await fn();
      await reload();
      toast.success(ok);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const onPaid = async (input: Parameters<typeof submitOfflinePayment>[1]) => {
    const updated = await submitOfflinePayment(booking.id, input);
    toast.success(remainingDue(updated) > 0
      ? 'Proof sent. You can add another payment from this list for the balance.'
      : 'Proof sent. The host will confirm when the money arrives.');
    navigate(`${base}/payments${asTraveller ? '?view=traveller' : ''}`);
  };

  const title = booking.payment?.reference ?? (canPay ? 'Pay the host' : 'Payment');

  return (
    <>
      <Link to={`${base}/payments${asTraveller ? '?view=traveller' : ''}`} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline"><ChevronLeft className="h-4 w-4" aria-hidden />All payments</Link>
      <PageHeader
        title={title}
        intro={booking.targetName}
        action={display ? <PaymentLedgerBadge status={display} /> : <BookingStatusBadge status={booking.status} />}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(260px,360px)_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-24">
          <section className="rounded-3xl border border-slate-200 bg-white p-5">
            <h2 className="font-display text-lg font-bold text-ink">Order summary</h2>
            <p className="mt-1 text-sm font-semibold text-ink">{booking.targetName}</p>
            <p className="text-sm text-slate-500">{formatDate(booking.date)}{booking.endDate ? ` → ${formatDate(booking.endDate)}` : ''}</p>
            <ul className="mt-4 divide-y divide-slate-100 text-sm">
              {lines.map((line) => (
                <li key={line.serviceId} className="flex justify-between gap-3 py-2">
                  <span className="text-slate-600">{line.serviceName} × {line.units}</span>
                  <span className="tabular-nums font-semibold">{formatRwf(line.lineTotalRwf)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 border-t border-slate-200 pt-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Booking total</span>
                <span className="font-display text-lg font-bold tabular-nums">{formatRwf(booking.totalRwf)}</span>
              </div>
              <div className="mt-2 flex justify-between text-sm">
                <span className="text-slate-500">Paid so far</span>
                <span className="font-semibold tabular-nums">{formatRwf(paid)}</span>
              </div>
              <div className="mt-2 flex justify-between text-sm">
                <span className="text-slate-500">{paid ? 'Remaining' : 'Minimum now (30%)'}</span>
                <span className="font-semibold tabular-nums">{formatRwf(paid ? remaining : due)}</span>
              </div>
              <p className="mt-4 flex items-start gap-2 text-xs text-slate-500"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" aria-hidden />Pay the host outside Tourista. You can split the total: 30% first, then add payments until it is complete.</p>
              <Link to={`${base}/bookings/${booking.id}`} className="mt-4 inline-flex text-sm font-semibold text-brand-600 hover:underline">Open booking</Link>
              {booking.payment && (
                <div className="mt-4">
                  <InvoiceActions bookingId={booking.id} />
                </div>
              )}
            </div>
          </section>
        </aside>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
          {canPay && (
            <>
              <div className="mb-5">
                <h2 className="font-display text-xl font-bold text-ink">{paid ? 'Add another payment' : 'Pay the host'}</h2>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
                  {booking.status === 'AwaitingPayment'
                    ? <><Clock className="h-4 w-4" aria-hidden />{remainingLabel(booking.paymentDueAt)} to send at least 30%.</>
                    : <>Balance {formatRwf(remaining)}. Send another transfer to finish the booking.</>}
                </p>
              </div>
              <OfflinePaymentForm amountRwf={booking.totalRwf} alreadyPaid={paid} payout={payout.data} payoutLoading={payout.loading} onSubmit={onPaid} />
            </>
          )}

          {!!transfers.length && (
            <div className={canPay ? 'mt-8 border-t border-slate-100 pt-6' : ''}>
              <h2 className="font-display text-xl font-bold text-ink">Transfers sent</h2>
              <p className="mt-1 text-sm text-slate-500">{formatRwf(paid)} of {formatRwf(booking.totalRwf)} recorded.</p>
              <ul className="mt-5 space-y-4">
                {transfers.map((t) => (
                  <li key={t.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-ink">{t.reference}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{formatDate(t.paidAt)} · {paymentMethodLabel[t.method]}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <MethodMark method={t.method} />
                        {t.status === 'Pending' ? <Badge tone="warning">Waiting for host</Badge> : <Badge tone="success">Confirmed</Badge>}
                      </div>
                    </div>
                    <dl className="mt-3 divide-y divide-slate-100 text-sm">
                      <div className="flex justify-between gap-4 py-2"><dt className="text-slate-500">Amount</dt><dd className="font-display font-bold tabular-nums">{formatRwf(t.amountRwf)}</dd></div>
                      <div className="flex justify-between gap-4 py-2"><dt className="text-slate-500">Sent from</dt><dd className="text-right font-semibold">{t.senderName}<span className="mt-0.5 block font-mono text-xs font-normal text-slate-500">{t.senderAccount}</span></dd></div>
                      {t.sentTo && (
                        <div className="flex justify-between gap-4 py-2"><dt className="text-slate-500">Paid to</dt><dd className="text-right font-semibold">{t.sentToLabel}<span className="mt-0.5 block font-mono text-xs font-normal text-slate-500">{t.sentTo}</span></dd></div>
                      )}
                    </dl>
                    {t.screenshot && <img src={t.screenshot} alt={`Proof ${t.reference}`} className="mt-3 max-h-56 rounded-2xl border border-slate-200" />}
                  </li>
                ))}
              </ul>
              {pendingProof && tourist && (
                <p className="mt-4 flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900"><Clock className="h-4 w-4 shrink-0" aria-hidden />Waiting for the host to confirm {remaining > 0 ? 'this transfer' : 'the money arrived'}.</p>
              )}
              {booking.payment?.status === 'Paid' && remaining <= 0 && (
                <p className="mt-4 flex items-center gap-2 rounded-xl bg-teal-50 px-4 py-3 text-sm text-teal-900"><CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />Host confirmed the booking is paid in full.</p>
              )}
              {booking.payment?.status === 'Paid' && remaining > 0 && (
                <p className="mt-4 flex items-center gap-2 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800"><Clock className="h-4 w-4 shrink-0" aria-hidden />{formatRwf(remaining)} still due. Add another payment above.</p>
              )}
            </div>
          )}

          {!booking.payment && !canPay && (
            <p className="text-sm text-slate-600">
              {!asTraveller && booking.status === 'AwaitingPayment'
                ? `Waiting for the traveller. Window: ${remainingLabel(booking.paymentDueAt)}.`
                : 'No transfer has been recorded yet. The traveller pays after the host approves the booking.'}
            </p>
          )}

          {host && pendingProof && (
            <Button className="mt-6" loading={busy} onClick={() => run(() => confirmHostReceivedPayment(booking.id), 'Payment marked as received.')}>Confirm money received</Button>
          )}

          {canRefund && (
            <ButtonLink to={`${base}/refunds/new?payment=${booking.id}`} variant="secondary" className="mt-6">
              <RotateCcw className="h-4 w-4" aria-hidden />Ask for a refund
            </ButtonLink>
          )}
          {refund && tourist && (
            <ButtonLink to={`${base}/refunds/${refund.id}${asTraveller ? '?viewer=traveller' : ''}`} variant="ghost" className="mt-3">Open refund {refund.id.toUpperCase()}</ButtonLink>
          )}
        </section>
      </div>
    </>
  );
}
