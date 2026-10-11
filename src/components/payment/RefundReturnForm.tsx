import { useState } from 'react';
import { CheckCircle2, Copy, ShieldCheck } from 'lucide-react';
import type { PaymentMethod } from '@/types';
import { Button, ImageUpload, Input } from '@/components/ui';
import { AirtelLogo, CardIcon, MastercardLogo, MtnLogo, VisaLogo } from './PaymentIcons';
import { formatRwf } from '@/utils/format';
import { formatPayAccount, mobileNetwork, paymentMethodLabel, validateBankAccount } from '@/utils/payment';
import { cn } from '@/utils/cn';

const METHODS: { id: PaymentMethod; title: string; how: string; Logo: (p: { className?: string }) => JSX.Element }[] = [
  { id: 'mtn', title: 'MTN MoMo', how: 'Send from your MTN MoMo', Logo: MtnLogo },
  { id: 'airtel', title: 'Airtel Money', how: 'Send from your Airtel Money', Logo: AirtelLogo },
  { id: 'card', title: 'Bank transfer', how: 'Send from your bank account', Logo: CardIcon },
];

function senderFields(method: PaymentMethod | '') {
  if (method === 'mtn') {
    return {
      accountLabel: 'MTN number you sent from',
      accountHint: 'The 078 or 079 line the refund left from.',
      accountPlaceholder: '078 123 4567',
      nameLabel: 'Name on that MTN account',
    };
  }
  if (method === 'airtel') {
    return {
      accountLabel: 'Airtel number you sent from',
      accountHint: 'The 072 or 073 line the refund left from.',
      accountPlaceholder: '073 123 4567',
      nameLabel: 'Name on that Airtel account',
    };
  }
  if (method === 'card') {
    return {
      accountLabel: 'Bank account you sent from',
      accountHint: 'The account number on the transfer slip, 10 to 20 digits.',
      accountPlaceholder: 'Account number',
      nameLabel: 'Name on that bank account',
    };
  }
  return {
    accountLabel: 'Account you sent from',
    accountHint: 'Choose how you sent the refund first.',
    accountPlaceholder: 'Choose a method first',
    nameLabel: 'Name on that account',
  };
}

interface Props {
  amountRwf: number;
  receiveName: string;
  receiveAccount: string;
  receiveMethod: PaymentMethod;
  onSubmit: (input: { method: PaymentMethod; senderName: string; senderAccount: string; senderAddress: string; proof: string }) => Promise<void>;
}

export function RefundReturnForm({ amountRwf, receiveName, receiveAccount, receiveMethod, onSubmit }: Props) {
  const [method, setMethod] = useState<PaymentMethod | ''>('');
  const [senderName, setSenderName] = useState('');
  const [senderAccount, setSenderAccount] = useState('');
  const [senderAddress, setSenderAddress] = useState('');
  const [shot, setShot] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const fields = senderFields(method);

  const copyAccount = async () => {
    try {
      await navigator.clipboard.writeText(receiveAccount.replace(/\s/g, ''));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch { /* ignore */ }
  };

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!method) e.method = 'Choose the account you sent the refund from.';
    if (method === 'mtn' && mobileNetwork(senderAccount) !== 'mtn') e.senderAccount = 'Enter the MTN number that sent the refund (078 or 079).';
    else if (method === 'airtel' && mobileNetwork(senderAccount) !== 'airtel') e.senderAccount = 'Enter the Airtel number that sent the refund (072 or 073).';
    else if (method === 'card' && !validateBankAccount(senderAccount)) e.senderAccount = 'Enter the bank account that sent the refund (10 to 20 digits).';
    if (senderName.trim().length < 2) e.senderName = 'Enter the name on the account that sent the refund.';
    if (senderAddress.trim().length < 4) e.senderAddress = 'Enter the address registered on that account.';
    if (!shot[0]) e.shot = 'Add a screenshot of the refund transfer.';
    setErrors(e);
    if (Object.keys(e).length || !method) return;
    setBusy(true);
    try {
      await onSubmit({
        method,
        senderName: senderName.trim(),
        senderAccount: senderAccount.trim(),
        senderAddress: senderAddress.trim(),
        proof: shot[0],
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-brand-100 bg-brand-50/70 p-4 sm:p-5">
        <p className="text-sm font-semibold text-ink">Send the refund here</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          Pay <strong className="text-ink">{formatRwf(amountRwf)}</strong> to the traveller’s {paymentMethodLabel[receiveMethod]} account.
          The name on the transfer must be <strong className="text-ink">{receiveName}</strong>.
        </p>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">You will see this name</p>
          <p className="mt-1 font-display text-xl font-bold text-ink">{receiveName}</p>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">{paymentMethodLabel[receiveMethod]} to pay</p>
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-3">
            <p className="font-mono text-lg font-semibold tracking-wide text-ink">{formatPayAccount(receiveMethod, receiveAccount)}</p>
            <Button type="button" size="sm" variant="secondary" onClick={copyAccount}>
              <Copy className="h-3.5 w-3.5" aria-hidden />{copied ? 'Copied' : 'Copy number'}
            </Button>
          </div>
        </div>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-ink">1. Which account did you send from?</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {METHODS.map((m) => {
            const active = method === m.id;
            return (
              <label key={m.id} className={cn('relative flex cursor-pointer flex-col gap-2 rounded-2xl border-2 p-3.5 transition-colors', active ? 'border-brand-600 bg-brand-50' : 'border-slate-200 bg-white hover:border-brand-300')}>
                <input type="radio" name="refund-send-method" className="sr-only" checked={active} onChange={() => { setMethod(m.id); setErrors({}); }} />
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
                {active && <CheckCircle2 className="absolute right-2 top-2 h-4 w-4 text-brand-600" aria-hidden />}
              </label>
            );
          })}
        </div>
        {errors.method && <p className="mt-2 text-sm text-red-600">{errors.method}</p>}
      </fieldset>

      {method && (
        <>
          <div className="space-y-4">
            <p className="text-sm font-semibold text-ink">2. Who sent it?</p>
            <Input label={fields.accountLabel} required value={senderAccount} onChange={(e) => setSenderAccount(e.target.value)} error={errors.senderAccount} placeholder={fields.accountPlaceholder} hint={fields.accountHint} autoComplete="off" />
            <Input label={fields.nameLabel} required value={senderName} onChange={(e) => setSenderName(e.target.value)} error={errors.senderName} hint="As it appears on the confirmation, not a nickname." autoComplete="name" />
            <Input label="Address on that account" required value={senderAddress} onChange={(e) => setSenderAddress(e.target.value)} error={errors.senderAddress} hint="Street, district or the address registered on the wallet or bank." autoComplete="street-address" />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Amount to send</p>
            <p className="mt-1 font-display text-3xl font-bold tabular-nums text-ink">{formatRwf(amountRwf)}</p>
            <p className="mt-1 text-sm text-slate-600">The full approved refund. It cannot be changed.</p>
          </div>

          <ImageUpload label="3. Proof of refund" required max={1} value={shot} onChange={setShot} error={errors.shot} hint="Screenshot of the MTN, Airtel or bank confirmation." />

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex min-w-0 items-start gap-1.5 text-xs text-slate-500"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden />Tourista does not send the money. Submitting this proof marks the refund completed.</p>
            <Button size="lg" className="w-full shrink-0 whitespace-nowrap sm:w-auto" onClick={submit} loading={busy}>Mark as completed</Button>
          </div>
        </>
      )}
    </div>
  );
}
