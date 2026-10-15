import type { ChangeEvent } from 'react';
import { Input } from '@/components/ui';

export type PayoutForm = { bankAccount: string; mtnNumber: string; airtelNumber: string };

export function PayoutFields({
  values,
  onChange,
  errors,
  requireOne = false,
}: {
  values: PayoutForm;
  onChange: (next: PayoutForm) => void;
  errors?: Partial<PayoutForm & { accounts: string }>;
  /** Registration: one account is enough. The other two stay optional. */
  requireOne?: boolean;
}) {
  const set = (key: keyof PayoutForm) => (e: ChangeEvent<HTMLInputElement>) => onChange({ ...values, [key]: e.target.value });
  return (
    <div className="grid gap-4 sm:grid-cols-2 sm:col-span-2">
      <p className="sm:col-span-2 text-sm text-slate-600">
        {requireOne
          ? 'At least one method is required. The other accounts are optional. Guests can only pay with a method you add.'
          : 'Guest payments are sent to these accounts, matching the method they use.'}
      </p>
      {errors?.accounts && <p role="alert" className="sm:col-span-2 text-sm font-medium text-red-700">{errors.accounts}</p>}
      <Input label="Bank account number" required={!requireOne} inputMode="numeric" value={values.bankAccount} onChange={set('bankAccount')} error={errors?.bankAccount} hint={requireOne ? 'Optional if you add MTN or Airtel. Card payments are transferred here.' : 'Card payments are transferred here.'} placeholder="4001 2345 6789 0123" />
      <Input label="MTN MoMo number" required={!requireOne} type="tel" inputMode="tel" value={values.mtnNumber} onChange={set('mtnNumber')} error={errors?.mtnNumber} hint={requireOne ? 'Optional if you add a bank account or Airtel. MTN payments (078 / 079) are sent here.' : 'MTN payments (078 / 079) are sent here.'} placeholder="078 123 4567" />
      <Input label="Airtel Money number" required={!requireOne} type="tel" inputMode="tel" value={values.airtelNumber} onChange={set('airtelNumber')} error={errors?.airtelNumber} hint={requireOne ? 'Optional if you add a bank account or MTN. Airtel payments (072 / 073) are sent here.' : 'Airtel payments (072 / 073) are sent here.'} placeholder="073 123 4567" />
    </div>
  );
}
