import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, ChevronLeft, ShieldCheck } from 'lucide-react';
import type { Booking, PaymentMethod, Refund } from '@/types';
import { getBookings, getRefunds, requestRefund } from '@/services';
import { useAsync, errorMessage } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useAuth, dashboardPathFor } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Button, ButtonLink, ErrorState, ImageUpload, Input, Loading, Textarea } from '@/components/ui';
import { PageHeader, PaymentLedgerBadge } from '@/components/dashboard';
import { AirtelLogo, CardIcon, MtnLogo } from '@/components/payment/PaymentIcons';
import { formatDate, formatRwf } from '@/utils/format';
import { cn } from '@/utils/cn';
import { mobileNetwork, paymentMethodLabel, paymentMethodShort, validateBankAccount } from '@/utils/payment';
import { refundIsClosed } from '@/utils/refund';

const METHODS: { id: PaymentMethod; title: string; hint: string; Logo: (p: { className?: string }) => JSX.Element }[] = [
  { id: 'mtn', title: 'MTN MoMo', hint: '078 or 079', Logo: MtnLogo },
  { id: 'airtel', title: 'Airtel Money', hint: '072 or 073', Logo: AirtelLogo },
  { id: 'card', title: 'Bank account', hint: 'Your bank', Logo: CardIcon },
];

function MethodMark({ method }: { method?: PaymentMethod }) {
  if (method === 'mtn') return <MtnLogo className="h-7 w-11 rounded-md" />;
  if (method === 'airtel') return <AirtelLogo className="h-7 w-11 rounded-md" />;
  return <CardIcon className="h-7 w-11" />;
}

function openRefundFor(bookingId: string, refunds: Refund[]) {
  return refunds.find((r) => r.bookingId === bookingId && !refundIsClosed(r.status));
}

function canRequest(booking: Booking, refunds: Refund[]) {
  return booking.payment?.status === 'Paid' && !openRefundFor(booking.id, refunds);
}

function accountHelp(method: PaymentMethod | '') {
  if (method === 'mtn') {
    return {
      label: 'Your MTN MoMo number',
      placeholder: '078 123 4567',
      hint: 'The refund is sent to this MTN number (078 or 079), not to the host. Use a line you can open.',
    };
  }
  if (method === 'airtel') {
    return {
      label: 'Your Airtel Money number',
      placeholder: '073 123 4567',
      hint: 'The refund is sent to this Airtel number (072 or 073), not to the host. Use a line you can open.',
    };
  }
  if (method === 'card') {
    return {
      label: 'Your bank account number',
      placeholder: 'Account number',
      hint: 'The refund is transferred to this bank account in your name, not back through the original card charge.',
    };
  }
  return {
    label: 'Account that will receive the refund',
    placeholder: 'Choose how you want to receive it first',
    hint: 'Pick MTN, Airtel, or a bank account you control. Admin sends the money here after approval.',
  };
}

export default function RefundRequestPage() {
  useDocumentTitle('Request a refund');
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const base = dashboardPathFor(user!.role);
  const { data, loading, error, reload } = useAsync(async () => {
    const [bookings, refunds] = await Promise.all([getBookings({ userId: user!.id }), getRefunds()]);
    return { bookings, refunds };
  }, [user?.id]);
  const bookings = data?.bookings;
  const refunds = data?.refunds ?? [];

  const confirmed = useMemo(
    () =>
      (bookings ?? [])
        .filter((b) => {
          if (!b.payment || b.payment.status === 'Refunded') return false;
          const approved = b.payment.ledger === 'approved' || b.payment.status === 'Paid';
          return approved && canRequest(b, refunds);
        })
        .sort((a, b) => new Date(b.payment?.paidAt ?? b.createdAt).getTime() - new Date(a.payment?.paidAt ?? a.createdAt).getTime()),
    [bookings, refunds],
  );

  const preselect = params.get('payment') ?? '';
  const [bookingId, setBookingId] = useState(preselect);
  const [reason, setReason] = useState('');
  const [method, setMethod] = useState<PaymentMethod | ''>('');
  const [account, setAccount] = useState('');
  const [receiveName, setReceiveName] = useState(user?.name ?? '');
  const [proof, setProof] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const booking = confirmed.find((b) => b.id === bookingId);
  const paid = booking?.payment?.amountRwf ?? 0;
  const openOnSelected = booking ? openRefundFor(booking.id, refunds) : undefined;
  const eligible = booking ? canRequest(booking, refunds) : false;
  const help = accountHelp(method);

  useEffect(() => {
    if (booking?.payment && eligible && !method) setMethod(booking.payment.method);
  }, [booking?.id, eligible]);

  const pick = (b: Booking) => {
    setBookingId(b.id);
    if (canRequest(b, refunds)) {
      setMethod(b.payment?.method ?? '');
      setErrors((prev) => ({ ...prev, bookingId: '' }));
    }
  };

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!booking || !eligible) e.bookingId = 'Select a confirmed payment that is not already in a refund.';
    if (reason.trim().length < 8) e.reason = 'Explain why you need a refund (at least 8 characters).';
    if (!method) e.method = 'Choose where the refund should be sent.';
    if (receiveName.trim().length < 2) e.receiveName = 'Enter the name registered on that account.';
    if (method === 'mtn' && mobileNetwork(account) !== 'mtn') e.account = 'Enter your MTN number starting with 078 or 079.';
    else if (method === 'airtel' && mobileNetwork(account) !== 'airtel') e.account = 'Enter your Airtel number starting with 072 or 073.';
    else if (method === 'card' && !validateBankAccount(account)) e.account = 'Enter your bank account (10 to 20 digits).';
    else if (!method && account.trim().length < 8) e.account = 'Choose a method, then enter that account.';
    setErrors(e);
    if (Object.keys(e).length || !booking || !method) return;
    setBusy(true);
    try {
      const refund = await requestRefund({
        bookingId: booking.id,
        reason,
        proof: proof[0],
        amountRwf: paid,
        receiveMethod: method,
        receiveAccount: account,
        receiveName,
      });
      toast.success('Refund requested. Admin will process it.');
      navigate(`${base}/refunds/${refund.id}`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loading label="Loading payments" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <>
      <Link to={`${base}/refunds`} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline"><ChevronLeft className="h-4 w-4" aria-hidden />All refunds</Link>
      <PageHeader title="Request a refund" intro="Select the confirmed payment on the left. The full amount you paid is refunded to the account you give on the right." />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(280px,380px)_minmax(0,1fr)]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 lg:sticky lg:top-24">
          <h2 className="font-display text-lg font-bold text-ink">Confirmed payments</h2>
          <p className="mt-1 text-sm text-slate-500">Host-confirmed transfers only. Tap one to refund it.</p>
          {confirmed.length === 0 ? (
            <p className="mt-5 rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-600">You do not have a confirmed payment yet. Refunds open after the host confirms your transfer.</p>
          ) : (
            <div role="listbox" aria-label="Confirmed payments" className="mt-4 max-h-[70vh] space-y-2 overflow-y-auto pr-1">
              {confirmed.map((b) => {
                const on = bookingId === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    role="option"
                    aria-selected={on}
                    onClick={() => pick(b)}
                    className={cn(
                      'w-full rounded-2xl border-2 p-3.5 text-left transition-colors',
                      on ? 'border-brand-600 bg-brand-50' : 'border-slate-200 bg-white hover:border-brand-200',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-ink">{b.payment?.reference ?? b.id.toUpperCase()}</p>
                        <p className="mt-0.5 truncate text-sm text-slate-600">{b.targetName}</p>
                      </div>
                      <MethodMark method={b.payment?.method} />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <p className="font-display text-base font-bold tabular-nums text-ink">{formatRwf(b.payment?.amountRwf ?? 0)}</p>
                      <PaymentLedgerBadge status="approved" />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Paid {formatDate(b.payment?.paidAt ?? b.createdAt)}
                      {b.payment ? ` · ${paymentMethodShort[b.payment.method]}` : ''}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
          {!booking ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center px-4 py-10 text-center">
              <p className="font-display text-xl font-bold text-ink">Select a payment</p>
              <p className="mt-2 max-w-sm text-sm text-slate-500">Choose a confirmed payment on the left. We will refund the exact amount you paid — there is no amount to type.</p>
              {errors.bookingId && <p className="mt-3 text-sm text-red-600">{errors.bookingId}</p>}
            </div>
          ) : openOnSelected && !eligible ? (
            <div className="space-y-4">
              <h2 className="font-display text-xl font-bold text-ink">Refund already started</h2>
              <p className="text-sm text-slate-600">
                {booking.targetName} already has a refund of {formatRwf(openOnSelected.amountRwf)}. Open that request instead of starting another.
              </p>
              <ButtonLink to={`${base}/refunds/${openOnSelected.id}`}>Open this refund</ButtonLink>
            </div>
          ) : booking.payment?.status === 'Refunded' ? (
            <div className="space-y-4">
              <h2 className="font-display text-xl font-bold text-ink">Already refunded</h2>
              <p className="text-sm text-slate-600">{formatRwf(paid)} for {booking.targetName} was already returned. Pick another confirmed payment.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-xl font-bold text-ink">Refund details</h2>
                <p className="mt-1 text-sm text-slate-500">{booking.payment?.reference} · {booking.targetName}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Amount to refund</p>
                <p className="mt-1 font-display text-3xl font-bold tabular-nums text-ink">{formatRwf(paid)}</p>
                <p className="mt-2 flex items-start gap-2 text-sm text-slate-600">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                  This is the full amount you paid on {formatDate(booking.payment?.paidAt ?? booking.createdAt)}. It is filled in for you and cannot be changed.
                </p>
              </div>

              <Textarea
                label="Why do you need this refund?"
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                error={errors.reason}
                hint="Dates, a cancellation, or what went wrong with the booking."
              />

              <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4 sm:p-5">
                <h3 className="font-display text-lg font-bold text-ink">Where should we send the money?</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                  After admin approves, the refund is sent <strong className="font-semibold text-ink">to you</strong>, outside Tourista.
                  This is not the host’s account and not the number you paid from unless you still want it there.
                  Enter an account you control, with the name written on that wallet or bank.
                </p>

                <fieldset className="mt-5">
                  <legend className="mb-2 text-sm font-semibold text-ink">How should we send it to you?</legend>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {METHODS.map((m) => {
                      const on = method === m.id;
                      return (
                        <label key={m.id} className={cn('relative flex cursor-pointer flex-col gap-1 rounded-2xl border-2 bg-white p-3', on ? 'border-brand-600' : 'border-slate-200')}>
                          <input type="radio" name="refund-receive" className="sr-only" checked={on} onChange={() => setMethod(m.id)} />
                          <span className="flex items-center gap-2">
                            <m.Logo className="shrink-0 rounded-md shadow-sm" />
                            <span className="text-sm font-bold text-ink">{m.title}</span>
                          </span>
                          <span className="text-xs text-slate-500">{m.hint}</span>
                        </label>
                      );
                    })}
                  </div>
                  {errors.method && <p className="mt-2 text-sm text-red-600">{errors.method}</p>}
                </fieldset>

                <div className="mt-4 space-y-4">
                  <Input
                    label="Name on that account"
                    required
                    value={receiveName}
                    onChange={(e) => setReceiveName(e.target.value)}
                    error={errors.receiveName}
                    autoComplete="name"
                    hint="Must match MTN, Airtel, or the bank — otherwise the transfer can bounce."
                  />
                  <Input
                    label={help.label}
                    required
                    value={account}
                    onChange={(e) => setAccount(e.target.value)}
                    error={errors.account}
                    placeholder={help.placeholder}
                    disabled={!method}
                    hint={help.hint}
                    autoComplete="off"
                  />
                </div>
              </div>

              {method && receiveName.trim() && account.trim() && (
                <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                  If approved, <strong className="text-ink">{formatRwf(paid)}</strong> will be sent to{' '}
                  <strong className="text-ink">{receiveName.trim()}</strong> via {paymentMethodLabel[method]} · {account.trim()}.
                </p>
              )}

              <ImageUpload label="Supporting proof (optional)" max={1} value={proof} onChange={setProof} hint="A message from the host, a charge, or a booking issue." />
              <p className="flex items-start gap-2 text-xs text-slate-500">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden />
                Admin reviews the request. You confirm on the refund page when the money arrives on this account.
              </p>
              <Button className="w-full sm:w-auto" loading={busy} onClick={submit}>Submit refund request</Button>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
