import { useState } from 'react';
import { CheckCircle2, Copy, ShieldCheck } from 'lucide-react';
import type { PaymentMethod } from '@/types';
import { Button, ImageUpload, Input } from '@/components/ui';
import { AirtelLogo, CardIcon, MastercardLogo, MtnLogo, VisaLogo } from './PaymentIcons';
import { formatRwf } from '@/utils/format';
import {
  formatPayAccount,
  mobileNetwork,
  paymentMethodLabel,
  payoutAccountFor,
  validateBankAccount,
  type PayoutTarget,
} from '@/utils/payment';
import { minDue } from '@/utils/lifecycle';
import { cn } from '@/utils/cn';

const METHODS: { id: PaymentMethod; title: string; how: string; Logo: (p: { className?: string }) => JSX.Element }[] = [
  { id: 'mtn', title: 'MTN MoMo', how: 'Send from the MTN MoMo app', Logo: MtnLogo },
  { id: 'airtel', title: 'Airtel Money', how: 'Send from the Airtel Money app', Logo: AirtelLogo },
  { id: 'card', title: 'Bank transfer', how: 'Pay at your bank or internet banking', Logo: CardIcon },
];

function senderFields(method: PaymentMethod | '') {
  if (method === 'mtn') {
    return {
      accountLabel: 'MTN number that sent the money',
      accountHint: 'The 078 or 079 line the transfer left from.',
      accountPlaceholder: '078 123 4567',
      nameLabel: 'Name on that MTN account',
      nameHint: 'As it appears on the MoMo confirmation, not a nickname.',
    };
  }
  if (method === 'airtel') {
    return {
      accountLabel: 'Airtel number that sent the money',
      accountHint: 'The 072 or 073 line the transfer left from.',
      accountPlaceholder: '073 123 4567',
      nameLabel: 'Name on that Airtel account',
      nameHint: 'As it appears on the Airtel confirmation.',
    };
  }
  if (method === 'card') {
    return {
      accountLabel: 'Bank account that sent the money',
      accountHint: 'The account number on the transfer slip, 10 to 20 digits.',
      accountPlaceholder: 'Account number',
      nameLabel: 'Name on that bank account',
      nameHint: 'The account holder name the bank shows on the transfer.',
    };
  }
  return {
    accountLabel: 'Account that sent the money',
    accountHint: 'Choose a method first.',
    accountPlaceholder: 'Choose a method first',
    nameLabel: 'Name on that account',
    nameHint: 'Must match the wallet or bank that sent the money.',
  };
}

interface Props {
  amountRwf: number;
  alreadyPaid?: number;
  payout: PayoutTarget | null | undefined;
  payoutLoading?: boolean;
  onSubmit: (input: {
    method: PaymentMethod;
    senderName: string;
    senderAccount: string;
    screenshot: string;
    amountRwf: number;
    sentTo: string;
    sentToLabel: string;
  }) => Promise<void>;
}

export function OfflinePaymentForm({ amountRwf, alreadyPaid = 0, payout, payoutLoading = false, onSubmit }: Props) {
  const methods = METHODS.filter((m) => payoutAccountFor(payout, m.id));
  const remaining = Math.max(0, amountRwf - alreadyPaid);
  const first = alreadyPaid <= 0;
  const floor = first ? minDue(amountRwf) : 1;
  const [method, setMethod] = useState<PaymentMethod | ''>('');
  const [senderName, setSenderName] = useState('');
  const [senderAccount, setSenderAccount] = useState('');
  const [paid, setPaid] = useState(String(first ? floor : remaining));
  const [shot, setShot] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const dest = method ? payoutAccountFor(payout, method) : '';
  const host = payout?.businessName ?? 'the host';
  const fields = senderFields(method);
  const n = Number(paid);

  const copyAccount = async () => {
    if (!dest) return;
    try {
      await navigator.clipboard.writeText(dest.replace(/\s/g, ''));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch { /* ignore */ }
  };

  const setAmount = (value: number) => setPaid(String(Math.min(remaining, Math.max(floor, Math.round(value)))));

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!method) e.method = 'Choose how you sent the money.';
    if (method && !dest) e.method = 'This host has not published that account yet. Pick another method.';
    if (method === 'mtn' && mobileNetwork(senderAccount) !== 'mtn') e.senderAccount = 'Enter the MTN number that sent the money (078 or 079).';
    else if (method === 'airtel' && mobileNetwork(senderAccount) !== 'airtel') e.senderAccount = 'Enter the Airtel number that sent the money (072 or 073).';
    else if (method === 'card' && !validateBankAccount(senderAccount)) e.senderAccount = 'Enter the bank account that sent the money (10 to 20 digits).';
    if (senderName.trim().length < 2) e.senderName = 'Enter the name on the account that sent the money.';
    if (!(n >= floor)) e.paid = first ? `The first payment must be at least 30% (${formatRwf(floor)}).` : 'Enter how much you sent.';
    if (n > remaining) e.paid = `You can send up to ${formatRwf(remaining)} remaining.`;
    if (!shot[0]) e.shot = 'Add a screenshot of the confirmation from the app or bank.';
    setErrors(e);
    if (Object.keys(e).length || !method || !dest) return;
    setBusy(true);
    try {
      await onSubmit({
        method,
        senderName: senderName.trim(),
        senderAccount: senderAccount.trim(),
        screenshot: shot[0],
        amountRwf: Math.round(n),
        sentTo: dest,
        sentToLabel: `${host} · ${paymentMethodLabel[method]}`,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{first ? 'Pay at least' : 'Remaining'}</p>
            <p className="mt-1 font-display text-3xl font-bold tabular-nums text-ink">{formatRwf(first ? floor : remaining)}</p>
          </div>
          <p className="text-sm text-slate-600">Booking {formatRwf(amountRwf)}{alreadyPaid ? ` · paid ${formatRwf(alreadyPaid)}` : ''}</p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
          <div className="h-full rounded-full bg-brand-600" style={{ width: `${Math.min(100, (alreadyPaid / amountRwf) * 100)}%` }} />
        </div>
        <p className="mt-3 text-sm text-slate-600">
          {first
            ? `Tourista does not take the money. Send at least 30% (${formatRwf(floor)}) to the host, then tell us who sent it. You can add another payment later until ${formatRwf(amountRwf)} is complete.`
            : `Add another transfer of up to ${formatRwf(remaining)} to finish this booking.`}
        </p>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-ink">1. How did you send the money?</legend>
        {methods.length > 0 ? (
          <div className={cn('grid gap-2', methods.length >= 3 ? 'sm:grid-cols-3' : methods.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-1')}>
            {methods.map((m) => {
              const active = method === m.id;
              const acc = payoutAccountFor(payout, m.id);
              return (
                <label key={m.id} className={cn('relative flex cursor-pointer flex-col gap-2 rounded-2xl border-2 p-3.5 transition-colors', active ? 'border-brand-600 bg-brand-50' : 'border-slate-200 bg-white hover:border-brand-300')}>
                  <input type="radio" name="pay-method" className="sr-only" checked={active} onChange={() => { setMethod(m.id); setErrors({}); }} />
                  <span className="flex items-center gap-2">
                    <m.Logo className="shrink-0 rounded-md shadow-sm" />
                    <span className="text-sm font-bold leading-tight text-ink">{m.title}</span>
                  </span>
                  {m.id === 'card' && (
                    <span className="flex items-center gap-1.5" aria-label="Visa and Mastercard">
                      <VisaLogo className="h-3.5" /><MastercardLogo className="h-4" />
                    </span>
                  )}
                  <span className="text-xs text-slate-500">{m.how}</span>
                  <span className="font-mono text-[11px] text-slate-600">{acc ? formatPayAccount(m.id, acc) : 'Not published yet'}</span>
                  {active && <CheckCircle2 className="absolute right-2 top-2 h-4 w-4 text-brand-600" aria-hidden />}
                </label>
              );
            })}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            {payoutLoading ? 'Loading payment options…' : 'This host has not published a payment account yet. Contact the host before sending money.'}
          </p>
        )}
        {errors.method && <p className="mt-2 text-sm text-red-600">{errors.method}</p>}
      </fieldset>

      {method && dest && (
        <>
          <div className="rounded-2xl border border-brand-100 bg-brand-50/70 p-4 sm:p-5">
            <p className="text-sm font-semibold text-ink">2. Send the money here</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              Open {paymentMethodLabel[method]} and pay <strong className="text-ink">{host}</strong>.
              The name that appears on the transfer must be <strong className="text-ink">{host}</strong> — if you see a different name, stop and choose another method.
            </p>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">You will see this name</p>
              <p className="mt-1 font-display text-xl font-bold text-ink">{host}</p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {method === 'card' ? 'Bank account to pay' : method === 'mtn' ? 'MTN MoMo to pay' : 'Airtel Money to pay'}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center justify-between gap-3">
                <p className="font-mono text-lg font-semibold tracking-wide text-ink">{formatPayAccount(method, dest)}</p>
                <Button type="button" size="sm" variant="secondary" onClick={copyAccount}>
                  <Copy className="h-3.5 w-3.5" aria-hidden />{copied ? 'Copied' : 'Copy number'}
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-sm font-semibold text-ink">3. Who sent it?</p>
            <p className="text-sm text-slate-600">This is your side of the transfer — the account the money left, so the host can match it.</p>
            <Input
              label={fields.accountLabel}
              required
              value={senderAccount}
              onChange={(e) => setSenderAccount(e.target.value)}
              error={errors.senderAccount}
              placeholder={fields.accountPlaceholder}
              hint={fields.accountHint}
              autoComplete="off"
            />
            <Input
              label={fields.nameLabel}
              required
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              error={errors.senderName}
              hint={fields.nameHint}
              autoComplete="name"
            />
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-ink">4. How much did you send?</p>
            <Input
              label="Amount sent (RWF)"
              type="number"
              min={floor}
              max={remaining}
              required
              value={paid}
              onChange={(e) => setPaid(e.target.value)}
              error={errors.paid}
              hint={first ? `Minimum 30% is ${formatRwf(floor)}. You may pay more, up to ${formatRwf(remaining)}.` : `Up to ${formatRwf(remaining)} remaining.`}
            />
            <div className="flex flex-wrap gap-2">
              {first && (
                <Button type="button" size="sm" variant="secondary" onClick={() => setAmount(floor)}>30% · {formatRwf(floor)}</Button>
              )}
              {remaining > floor && (
                <Button type="button" size="sm" variant="secondary" onClick={() => setAmount(Math.ceil(amountRwf / 2) - alreadyPaid)}>Half remaining</Button>
              )}
              <Button type="button" size="sm" variant="secondary" onClick={() => setAmount(remaining)}>Pay in full · {formatRwf(remaining)}</Button>
            </div>
          </div>

          <ImageUpload
            label="5. Proof of payment"
            required
            max={1}
            value={shot}
            onChange={setShot}
            error={errors.shot}
            hint="Screenshot of the MTN, Airtel or bank confirmation. One photo is enough."
          />

          {senderName.trim() && dest && n >= floor && (
            <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
              You sent <strong className="text-ink">{formatRwf(Math.round(n) || 0)}</strong> to <strong className="text-ink">{host}</strong>
              {remaining - Math.round(n) > 0 ? `. ${formatRwf(remaining - Math.round(n))} will still be due after this.` : '. This completes the booking total.'}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex min-w-0 items-start gap-1.5 text-xs text-slate-500"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden />The host confirms when the money arrives. Tourista never takes the transfer in-app.</p>
            <Button size="lg" className="w-full shrink-0 whitespace-nowrap sm:w-auto" onClick={submit} loading={busy}>Submit payment proof</Button>
          </div>
        </>
      )}
    </div>
  );
}
