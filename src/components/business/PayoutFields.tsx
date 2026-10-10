import type { ChangeEvent } from 'react';
import { Input } from '@/components/ui';

export type PayoutForm = { bankAccount: string; mtnNumber: string; airtelNumber: string };

export function PayoutFields({
  values,
  onChange,
  errors,
}: {
  values: PayoutForm;
  onChange: (next: PayoutForm) => void;
  errors?: Partial<PayoutForm>;
}) {
  const set = (key: keyof PayoutForm) => (e: ChangeEvent<HTMLInputElement>) => onChange({ ...values, [key]: e.target.value });
  return (
    <div className="grid gap-4 sm:grid-cols-2 sm:col-span-2">
      <p className="sm:col-span-2 text-sm text-slate-600">Guest payments are sent to these accounts, matching the method they use.</p>
      <Input label="Bank account number" required inputMode="numeric" value={values.bankAccount} onChange={set('bankAccount')} error={errors?.bankAccount} hint="Card payments are transferred here." placeholder="4001 2345 6789 0123" />
      <Input label="MTN MoMo number" required type="tel" inputMode="tel" value={values.mtnNumber} onChange={set('mtnNumber')} error={errors?.mtnNumber} hint="MTN payments (078 / 079) are sent here." placeholder="078 123 4567" />
      <Input label="Airtel Money number" required type="tel" inputMode="tel" value={values.airtelNumber} onChange={set('airtelNumber')} error={errors?.airtelNumber} hint="Airtel payments (072 / 073) are sent here." placeholder="073 123 4567" />
    </div>
  );
}
