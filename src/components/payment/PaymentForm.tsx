import { useEffect, useState } from 'react';
import { CheckCircle2, Lock, ShieldCheck, Smartphone, XCircle } from 'lucide-react';
import type { Payment, PaymentMethod } from '@/types';
import { Button, Input, Loading } from '@/components/ui';
import { AirtelLogo, CardIcon, MastercardLogo, MtnLogo, VisaLogo } from './PaymentIcons';
import { cn } from '@/utils/cn';
import { formatRwf } from '@/utils/format';
import {
  DECLINED_CARD, TEST_CARD, cardBrand, expiryValid, formatCardNumber, formatMobile, formatPayoutAccount, luhnValid, maskCard, maskMobile, mobileNetwork, paymentMethodLabel, paymentReference, payoutAccount, type PayoutTarget,
} from '@/utils/payment';

interface Props {
  amountRwf: number;
  /** Pre-fills the mobile money number. */
  defaultPhone?: string;
  onPaid: (payment: Payment) => void | Promise<void>;
  /** Label for the pay button, e.g. "Pay and confirm". */
  payLabel?: string;
  /** Business accounts that receive the money. */
  payout?: PayoutTarget | null;
}

type Phase = 'form' | 'processing' | 'awaiting-approval' | 'failed' | 'success';

const methods: { id: PaymentMethod; title: string; text: string; Logo: (p: { className?: string }) => JSX.Element }[] = [
  { id: 'card', title: 'Credit / debit card', text: 'Visa, Mastercard', Logo: CardIcon },
  { id: 'mtn', title: 'MTN MoMo', text: 'Numbers 078 / 079', Logo: MtnLogo },
  { id: 'airtel', title: 'Airtel Money', text: 'Numbers 072 / 073', Logo: AirtelLogo },
];

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Simulated checkout. Nothing is charged: card payments succeed unless the
 * test decline number is used; mobile money shows a simulated phone prompt.
 */
export function PaymentForm({ amountRwf, defaultPhone = '', onPaid, payLabel, payout }: Props) {
  const [method, setMethod] = useState<PaymentMethod>(() => mobileNetwork(defaultPhone) ?? 'mtn');
  const [card, setCard] = useState({ number: '', name: '', expiry: '', cvc: '' });
  const [phone, setPhone] = useState(mobileNetwork(defaultPhone) ? defaultPhone : '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<Phase>('form');
  const [failure, setFailure] = useState('');
  const [countdown, setCountdown] = useState(60);

  // Mobile money approval window.
  useEffect(() => {
    if (phase !== 'awaiting-approval') return;
    const t = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (phase === 'awaiting-approval' && countdown === 0) {
      setFailure('The payment request expired before it was approved. Try again.');
      setPhase('failed');
    }
  }, [phase, countdown]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (method === 'card') {
      if (!luhnValid(card.number)) e.number = 'Enter a valid card number.';
      if (card.name.trim().length < 3) e.name = 'Enter the name shown on the card.';
      if (!expiryValid(card.expiry)) e.expiry = 'Use MM/YY, not in the past.';
      if (!/^\d{3,4}$/.test(card.cvc)) e.cvc = '3 or 4 digits.';
    } else {
      const net = mobileNetwork(phone);
      if (!net) e.phone = 'Enter a Rwandan mobile number, e.g. 078 123 4567.';
      else if (net !== method) e.phone = method === 'mtn' ? 'That is an Airtel number. MTN numbers start with 078 or 079.' : 'That is an MTN number. Airtel numbers start with 072 or 073.';
    }
    setErrors(e);
    return !Object.keys(e).length;
  };

  const destination = payoutAccount(payout ?? undefined, method);
  const destinationLabel = payout && destination
    ? `${payout.businessName} · ${method === 'card' ? 'bank account' : paymentMethodLabel[method]}`
    : undefined;

  const finish = async (account: string) => {
    const payment: Payment = {
      method, status: 'Paid', account, reference: paymentReference(method), amountRwf, paidAt: new Date().toISOString(),
      sentTo: destination ? formatPayoutAccount(method, destination) : undefined,
      sentToLabel: destinationLabel,
    };
    setPhase('success');
    await onPaid(payment);
  };

  const pay = async () => {
    if (!validate()) return;
    setFailure('');
    if (method === 'card') {
      setPhase('processing');
      await wait(1800);
      if (card.number.replace(/\D/g, '') === DECLINED_CARD.replace(/\D/g, '')) {
        setFailure('Your bank declined this card. Try another card or pay with mobile money.');
        setPhase('failed');
        return;
      }
      await finish(maskCard(card.number));
    } else {
      setPhase('processing');
      await wait(1200);
      // Reset in the same update as the phase change, so the expiry check never sees a stale 0.
      setCountdown(60);
      setPhase('awaiting-approval');
    }
  };

  const approve = async () => {
    setPhase('processing');
    await wait(1000);
    await finish(maskMobile(phone));
  };

  const decline = () => {
    setFailure('The payment was declined on your phone. No money was taken.');
    setPhase('failed');
  };

  if (phase === 'success') {
    return (
      <div role="status" className="flex flex-col items-center py-8 text-center">
        <CheckCircle2 className="h-12 w-12 text-brand-600" aria-hidden />
        <p className="mt-3 font-display text-xl font-bold text-ink">Payment received</p>
        <p className="text-sm text-slate-600">{formatRwf(amountRwf)} paid. Finishing up…</p>
      </div>
    );
  }

  if (phase === 'processing') {
    return (
      <div>
        <Loading variant="section" label={method === 'card' ? 'Contacting your bank' : 'Processing payment'} className="min-h-0 py-8" />
        <p className="text-center text-sm text-slate-500">Don't close this page.</p>
      </div>
    );
  }

  if (phase === 'awaiting-approval') {
    return (
      <div className="grid gap-6 md:grid-cols-[1fr_240px] md:items-center">
        <div>
          <p className="font-display text-xl font-bold text-ink">Approve on your phone</p>
          <p className="mt-1 text-slate-600">
            We sent a request for <strong>{formatRwf(amountRwf)}</strong> to <strong>{formatMobile(phone)}</strong>. Enter your {method === 'mtn' ? 'MoMo' : 'Airtel Money'} PIN on your phone to approve it.
          </p>
          <p className="mt-3 text-sm text-slate-500">No prompt? Dial {method === 'mtn' ? '*182*7*1#' : '*182*6#'} to see pending approvals. Request expires in <span className="font-semibold tabular-nums text-ink">{countdown}s</span>.</p>
          <Button variant="ghost" size="sm" className="mt-3" onClick={() => setPhase('form')}>Change number or method</Button>
        </div>
        {/* Simulated handset, so the flow can be completed in the demo. */}
        <div className="mx-auto w-full max-w-[240px] rounded-[28px] border-[6px] border-ink bg-white p-4 shadow-lift" aria-label="Simulated phone">
          <p className="text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">Simulated phone</p>
          <div className="mt-3 rounded-xl bg-brand-50 p-3 text-sm text-ink">
            <p className="flex items-center gap-2 font-semibold">{method === 'mtn' ? <MtnLogo className="h-6 w-9 rounded" /> : <AirtelLogo className="h-6 w-9 rounded" />}{paymentMethodLabel[method]}</p>
            <p className="mt-1">Pay {formatRwf(amountRwf)} to {payout?.businessName ?? 'TOURISTA RWANDA'}{destination ? ` (${formatPayoutAccount(method, destination)})` : ''}?</p>
            <p className="mt-2 text-xs text-slate-500">Enter PIN to confirm</p>
            <div className="mt-1 flex justify-center gap-1.5" aria-hidden>{[0, 1, 2, 3, 4].map((i) => <span key={i} className="h-2 w-2 rounded-full bg-brand-600" />)}</div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={decline} className="h-9 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50">Decline</button>
            <button onClick={approve} className="h-9 rounded-lg bg-brand-600 text-sm font-semibold text-white hover:bg-brand-700">Approve</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {phase === 'failed' && (
        <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{failure}
        </p>
      )}

      {payout && (
        <p className="rounded-xl bg-brand-50 px-4 py-3 text-sm text-ink">
          {destination
            ? <>This payment is sent to <strong>{payout.businessName}</strong> ({formatPayoutAccount(method, destination)}).</>
            : <>{payout.businessName} has not added a {method === 'card' ? 'bank account' : paymentMethodLabel[method] + ' number'} yet. Choose another method or ask the host to add payout details.</>}
        </p>
      )}

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-ink">Pay with</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {methods.map((m) => {
            const active = m.id === method;
            return (
              <label key={m.id} className={cn('relative flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-300', active ? 'border-brand-600 bg-brand-50' : 'border-slate-200 bg-white hover:border-brand-300')}>
                <input type="radio" name="payment-method" className="sr-only" checked={active} onChange={() => { setMethod(m.id); setErrors({}); setPhase('form'); }} />
                <m.Logo className="shrink-0 rounded-md shadow-sm" />
                <span className="min-w-0">
                  <span className="block text-sm font-bold leading-tight text-ink">{m.title}</span>
                  {m.id === 'card' ? (
                    <span className="mt-1 flex items-center gap-1.5" aria-label="Visa and Mastercard accepted">
                      <VisaLogo className="h-3.5" /><MastercardLogo className="h-4" />
                    </span>
                  ) : (
                    <span className="block text-xs text-slate-500">{m.text}</span>
                  )}
                </span>
                {active && <CheckCircle2 className="absolute right-2 top-2 h-4 w-4 text-brand-600" aria-hidden />}
              </label>
            );
          })}
        </div>
      </fieldset>

      {method === 'card' ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="relative sm:col-span-2">
            <Input label="Card number" inputMode="numeric" autoComplete="cc-number" placeholder="1234 5678 9012 3456" value={card.number} onChange={(e) => setCard({ ...card, number: formatCardNumber(e.target.value) })} error={errors.number} />
            {card.number.length > 1 && <span className="absolute right-3 top-[38px] text-xs font-bold text-brand-600">{cardBrand(card.number)}</span>}
          </div>
          <div className="sm:col-span-2"><Input label="Name on card" autoComplete="cc-name" value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} error={errors.name} /></div>
          <Input label="Expiry" inputMode="numeric" autoComplete="cc-exp" placeholder="MM/YY" value={card.expiry} onChange={(e) => setCard({ ...card, expiry: e.target.value.replace(/[^\d/]/g, '').replace(/^(\d{2})(\d)/, '$1/$2').slice(0, 5) })} error={errors.expiry} />
          <Input label="CVC" inputMode="numeric" autoComplete="cc-csc" placeholder="123" value={card.cvc} onChange={(e) => setCard({ ...card, cvc: e.target.value.replace(/\D/g, '').slice(0, 4) })} error={errors.cvc} />
          <p className="text-xs text-slate-500 sm:col-span-2">
            Demo: use <button type="button" className="font-mono font-semibold text-brand-600 underline" onClick={() => setCard({ number: TEST_CARD, name: card.name || 'Test Traveller', expiry: card.expiry || '12/30', cvc: card.cvc || '123' })}>{TEST_CARD}</button> to succeed, or <span className="font-mono">{DECLINED_CARD}</span> to see a decline.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <Input label={`${method === 'mtn' ? 'MTN MoMo' : 'Airtel Money'} number`} type="tel" inputMode="tel" autoComplete="tel" placeholder={method === 'mtn' ? '078 123 4567' : '073 123 4567'} value={phone} onChange={(e) => setPhone(e.target.value)} error={errors.phone} />
          <p className="flex items-center gap-1.5 text-xs text-slate-500"><Smartphone className="h-3.5 w-3.5" aria-hidden />You'll get a prompt on this phone to approve the payment with your PIN.</p>
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-1.5 text-xs text-slate-500"><ShieldCheck className="h-4 w-4 text-brand-600" aria-hidden />Simulated payment. No real money is charged.</p>
        <Button size="lg" onClick={pay} disabled={!!payout && !destination}><Lock className="h-4 w-4" aria-hidden />{payLabel ?? `Pay ${formatRwf(amountRwf)}`}</Button>
      </div>
    </div>
  );
}
