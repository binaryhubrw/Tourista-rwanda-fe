import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Clock, ShieldCheck } from 'lucide-react';
import { approveRefund, cancelRefund, completeRefund, getBookingById, getRefundById, rejectRefund } from '@/services';
import { useAsync, errorMessage } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { isHostRole, isTravellerQuery } from '@/hooks/useViewerMode';
import { useAuth, dashboardPathFor } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Button, ConfirmModal, ErrorState, Loading, Textarea } from '@/components/ui';
import { PageHeader, RefundStageBadge } from '@/components/dashboard';
import { RefundReturnForm } from '@/components/payment/RefundReturnForm';
import { AirtelLogo, CardIcon, MtnLogo } from '@/components/payment/PaymentIcons';
import { bookingLines } from '@/utils/availability';
import { formatDate, formatRwf } from '@/utils/format';
import { formatPayAccount, paymentMethodLabel } from '@/utils/payment';
import type { PaymentMethod, RefundReturn } from '@/types';

function MethodMark({ method }: { method?: PaymentMethod }) {
  if (method === 'mtn') return <MtnLogo className="h-8 w-12 rounded-md" />;
  if (method === 'airtel') return <AirtelLogo className="h-8 w-12 rounded-md" />;
  return <CardIcon className="h-8 w-12" />;
}

function ReturnDetails({ transfer }: { transfer: RefundReturn }) {
  return (
    <section className="mt-8 border-t border-slate-100 pt-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-ink">Refund sent</h2>
          <p className="mt-1 text-sm text-slate-500">Reference {transfer.reference}</p>
        </div>
        <MethodMark method={transfer.method} />
      </div>
      <dl className="mt-5 divide-y divide-slate-100 text-sm">
        <div className="flex justify-between gap-4 py-2.5"><dt className="text-slate-500">Sent to</dt><dd className="text-right font-semibold">{transfer.sentToName}<span className="mt-0.5 block font-mono text-xs font-normal text-slate-500">{formatPayAccount(transfer.method, transfer.sentTo)}</span></dd></div>
        <div className="flex justify-between gap-4 py-2.5"><dt className="text-slate-500">Sent from</dt><dd className="text-right font-semibold">{transfer.senderName}<span className="mt-0.5 block font-mono text-xs font-normal text-slate-500">{paymentMethodLabel[transfer.method]} · {transfer.senderAccount}</span></dd></div>
        <div className="flex justify-between gap-4 py-2.5"><dt className="text-slate-500">Sender address</dt><dd className="text-right font-semibold">{transfer.senderAddress}</dd></div>
        <div className="flex justify-between gap-4 py-2.5"><dt className="text-slate-500">Submitted</dt><dd className="font-semibold">{formatDate(transfer.sentAt)}</dd></div>
      </dl>
      {transfer.proof && (
        <div className="mt-4">
          <p className="mb-2 text-sm font-semibold text-ink">Proof of refund</p>
          <img src={transfer.proof} alt="Refund transfer proof" className="max-h-72 rounded-2xl border border-slate-200" />
        </div>
      )}
    </section>
  );
}

export default function RefundDetailsPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const base = dashboardPathFor(user!.role);
  const [searchParams] = useSearchParams();
  const asTraveller = user?.role === 'tourist' || (isHostRole(user?.role) && isTravellerQuery(searchParams));
  const { data, loading, error, reload } = useAsync(async () => {
    const refund = await getRefundById(id);
    const booking = await getBookingById(refund.bookingId);
    return { refund, booking };
  }, [id, user?.id, user?.role]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  useDocumentTitle(data ? `Refund ${data.refund.id.toUpperCase()}` : 'Refund');

  if (loading) return <Loading label="Loading refund" />;
  if (error || !data || !user) return <ErrorState message={error ?? 'Refund was not found.'} onRetry={reload} />;

  const { booking } = data;
  const refund = data.refund;
  const admin = user.role === 'admin';
  const tourist = asTraveller;
  const host = isHostRole(user.role) && !asTraveller;
  const lines = bookingLines(booking);
  const plates = lines.flatMap((line) => line.plateNumbers ?? []);
  const waitingAdmin = refund.status === 'requested' || refund.status === 'owner_review' || refund.status === 'admin_review';
  const canCancel = tourist && waitingAdmin;
  const canComplete = host && refund.status === 'returning' && refund.receiveMethod && refund.receiveAccount && refund.receiveName;

  const decide = async (next: 'returning' | 'rejected') => {
    setBusy(true);
    try {
      if (next === 'returning') await approveRefund(refund.id, note || undefined);
      else await rejectRefund(refund.id, note || undefined);
      setRejecting(false);
      setNote('');
      await reload();
      toast.success(next === 'returning' ? 'Refund approved. The host will return the money.' : 'Refund rejected.');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const confirmCancel = async () => {
    setBusy(true);
    try {
      await cancelRefund(refund.id);
      setCancelling(false);
      await reload();
      toast.success('Refund canceled. Your booking stays confirmed.');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Link to={`${base}/refunds${asTraveller ? '?viewer=traveller' : ''}`} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline"><ChevronLeft className="h-4 w-4" aria-hidden />All refunds</Link>
      <PageHeader title={refund.id.toUpperCase()} intro={booking.targetName} action={<RefundStageBadge status={refund.status} />} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_380px]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
          <h2 className="font-display text-xl font-bold text-ink">Request</h2>
          <dl className="mt-5 divide-y divide-slate-100 text-sm">
            <div className="flex justify-between gap-4 py-2.5"><dt className="text-slate-500">Amount</dt><dd className="font-display text-lg font-bold tabular-nums">{formatRwf(refund.amountRwf)}</dd></div>
            <div className="flex justify-between gap-4 py-2.5"><dt className="text-slate-500">Original payment</dt><dd className="font-semibold">{booking.payment?.reference ?? booking.id.toUpperCase()}</dd></div>
            <div className="flex justify-between gap-4 py-2.5"><dt className="text-slate-500">{tourist ? 'Branch' : 'Guest'}</dt><dd className="font-semibold">{tourist ? booking.targetName : booking.customerName}</dd></div>
            <div className="flex justify-between gap-4 py-2.5">
              <dt className="text-slate-500">Return to</dt>
              <dd className="text-right font-semibold">{refund.receiveName}<span className="mt-0.5 block text-xs font-normal text-slate-500">{refund.receiveMethod ? paymentMethodLabel[refund.receiveMethod] : ''} · {refund.receiveAccount}</span></dd>
            </div>
          </dl>
          <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">{refund.reason}</p>
          {refund.travelerProof && <img src={refund.travelerProof} alt="Traveller proof" className="mt-4 max-h-56 rounded-2xl border" />}

          {tourist && waitingAdmin && (
            <p className="mt-4 flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900"><Clock className="h-4 w-4 shrink-0" aria-hidden />Admin has your request and will approve or decline it.</p>
          )}
          {tourist && refund.status === 'returning' && (
            <p className="mt-4 flex items-center gap-2 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800"><Clock className="h-4 w-4 shrink-0" aria-hidden />Approved. The host is sending {formatRwf(refund.amountRwf)} to {refund.receiveName}.</p>
          )}
          {host && waitingAdmin && (
            <p className="mt-4 flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900"><Clock className="h-4 w-4 shrink-0" aria-hidden />Waiting for admin to approve or reject this refund.</p>
          )}

          {admin && waitingAdmin && (
            <div className="mt-6 space-y-3">
              <Textarea label="Note to the file (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
              <div className="flex flex-wrap gap-2">
                <Button loading={busy} onClick={() => decide('returning')}>Approve refund</Button>
                <Button variant="danger" loading={busy} onClick={() => setRejecting(true)}>Reject</Button>
              </div>
            </div>
          )}

          {canComplete && (
            <div className="mt-8 border-t border-slate-100 pt-6">
              <h2 className="font-display text-xl font-bold text-ink">Mark as completed</h2>
              <p className="mt-1 mb-5 text-sm text-slate-600">Send {formatRwf(refund.amountRwf)} to the traveller’s account, then record the transfer here.</p>
              <RefundReturnForm
                amountRwf={refund.amountRwf}
                receiveName={refund.receiveName!}
                receiveAccount={refund.receiveAccount!}
                receiveMethod={refund.receiveMethod!}
                onSubmit={async (input) => {
                  await completeRefund(refund.id, input);
                  await reload();
                  toast.success('Refund marked completed.');
                }}
              />
            </div>
          )}

          {canCancel && (
            <Button variant="danger" className="mt-6" loading={busy} onClick={() => setCancelling(true)}>Cancel refund</Button>
          )}

          {refund.returnTransfer && <ReturnDetails transfer={refund.returnTransfer} />}
        </section>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <section className="rounded-3xl border border-slate-200 bg-white p-5">
            <h2 className="font-display text-lg font-bold text-ink">Booking</h2>
            <p className="mt-1 text-sm font-semibold text-ink">{booking.targetName}</p>
            <p className="text-sm text-slate-500">{formatDate(booking.date)}{booking.endDate ? ` → ${formatDate(booking.endDate)}` : ''}</p>
            <ul className="mt-4 divide-y divide-slate-100 text-sm">
              {lines.map((line) => (
                <li key={line.serviceId} className="flex justify-between gap-3 py-2">
                  <span className="text-slate-600">{line.serviceName} × {line.units}{line.plateNumbers?.length ? ` · ${line.plateNumbers.join(', ')}` : ''}</span>
                  <span className="tabular-nums font-semibold">{formatRwf(line.lineTotalRwf)}</span>
                </li>
              ))}
            </ul>
            {!!plates.length && <p className="mt-1 text-xs text-slate-500">Plates {plates.join(' · ')}</p>}
            <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 text-sm">
              <span className="text-slate-500">Booking total</span>
              <span className="font-display text-lg font-bold tabular-nums">{formatRwf(booking.totalRwf)}</span>
            </div>
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-slate-500">Refund amount</span>
              <span className="font-semibold tabular-nums">{formatRwf(refund.amountRwf)}</span>
            </div>
            <p className="mt-4 flex items-start gap-2 text-xs text-slate-500"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" aria-hidden />Money is returned outside Tourista to the account on this request.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link to={`${base}/payments/${booking.id}${asTraveller ? '?view=traveller' : ''}`} className="text-sm font-semibold text-brand-600 hover:underline">Open payment</Link>
              <Link to={`${base}/bookings/${booking.id}${asTraveller ? '?viewer=traveller' : ''}`} className="text-sm font-semibold text-brand-600 hover:underline">Open booking</Link>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5">
            <h2 className="font-display text-lg font-bold text-ink">Timeline</h2>
            <ol className="mt-4 space-y-2">
              {refund.steps.map((s) => (
                <li key={s.at + s.action} className="rounded-xl bg-slate-50 p-3 text-sm">
                  <p className="font-semibold text-ink">{s.action}</p>
                  <p className="text-xs text-slate-500">{s.by} · {formatDate(s.at)}</p>
                  {s.note && <p className="mt-1 text-slate-600">{s.note}</p>}
                  {s.proof && <img src={s.proof} alt="" className="mt-2 max-h-32 rounded-lg border" />}
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>

      <ConfirmModal
        open={cancelling}
        title="Cancel this refund?"
        message={`The request for ${formatRwf(refund.amountRwf)} will be withdrawn. ${booking.targetName} stays booked.`}
        confirmLabel="Cancel refund"
        loading={busy}
        onConfirm={confirmCancel}
        onCancel={() => setCancelling(false)}
      />
      <ConfirmModal
        open={rejecting}
        title="Reject this refund?"
        message={`The traveller will not receive ${formatRwf(refund.amountRwf)}. The booking stays confirmed.`}
        confirmLabel="Reject refund"
        loading={busy}
        onConfirm={() => decide('rejected')}
        onCancel={() => setRejecting(false)}
      />
    </>
  );
}
