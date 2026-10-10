import type { PaymentMethod } from '@/types';

export const paymentMethodLabel: Record<PaymentMethod, string> = {
  card: 'Credit / debit card',
  mtn: 'MTN Mobile Money',
  airtel: 'Airtel Money',
};

export const paymentMethodShort: Record<PaymentMethod, string> = { card: 'Card', mtn: 'MTN MoMo', airtel: 'Airtel Money' };

/** Rwandan mobile prefixes: MTN 078/079, Airtel 072/073. */
export function mobileNetwork(phone: string): 'mtn' | 'airtel' | null {
  const digits = phone.replace(/\D/g, '');
  const local = digits.startsWith('250') ? digits.slice(3) : digits.startsWith('0') ? digits.slice(1) : digits;
  if (local.length !== 9) return null;
  if (/^7[89]/.test(local)) return 'mtn';
  if (/^7[23]/.test(local)) return 'airtel';
  return null;
}

export const formatMobile = (phone: string) => {
  const d = phone.replace(/\D/g, '');
  const local = d.startsWith('250') ? d.slice(3) : d.startsWith('0') ? d.slice(1) : d;
  return `+250 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
};

export const maskMobile = (phone: string) => {
  const f = formatMobile(phone);
  return `${f.slice(0, 8)} *** ${f.slice(-3)}`;
};

export function luhnValid(number: string) {
  const digits = number.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

export function cardBrand(number: string) {
  const d = number.replace(/\D/g, '');
  if (/^4/.test(d)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(d)) return 'Mastercard';
  if (/^3[47]/.test(d)) return 'Amex';
  return 'Card';
}

export const formatCardNumber = (v: string) => v.replace(/\D/g, '').slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ');

export const maskCard = (number: string) => `${cardBrand(number)} •••• ${number.replace(/\D/g, '').slice(-4)}`;

/** MM/YY that is this month or later. */
export function expiryValid(v: string) {
  const m = /^(\d{2})\s*\/\s*(\d{2})$/.exec(v.trim());
  if (!m) return false;
  const month = Number(m[1]);
  if (month < 1 || month > 12) return false;
  const now = new Date();
  const year = 2000 + Number(m[2]);
  return year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1);
}

export const paymentReference = (method: PaymentMethod) =>
  `${method === 'card' ? 'CRD' : method === 'mtn' ? 'MOMO' : 'AIR'}-${Date.now().toString(36).toUpperCase().slice(-6)}${Math.floor(Math.random() * 900 + 100)}`;

/** Simulator test values, shown in the payment form. */
export const TEST_CARD = '4242 4242 4242 4242';
export const DECLINED_CARD = '4000 0000 0000 0002';
