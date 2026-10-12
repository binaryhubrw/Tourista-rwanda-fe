import type { BookingStatus } from '@/types';

/** Platform subscription fee taken from each paid booking. */
export const SUBSCRIPTION_RATE = 0.1;
/** A guest must send at least this share of the total with their first transfer. */
export const MIN_PAY_RATE = 0.3;

export const minDue = (totalRwf: number) => Math.max(1, Math.ceil(totalRwf * MIN_PAY_RATE));
export const subscriptionFee = (totalRwf: number) => Math.round(totalRwf * SUBSCRIPTION_RATE);

const RELEASED: BookingStatus[] = ['Canceled', 'Declined', 'Expired', 'Refunded'];
export const occupiesInventory = (status: BookingStatus) => !RELEASED.includes(status);
