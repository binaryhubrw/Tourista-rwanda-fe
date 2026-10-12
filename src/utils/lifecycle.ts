import type { Booking, BookingStatus } from '@/types';

/** Platform subscription fee taken from each paid booking. */
export const SUBSCRIPTION_RATE = 0.1;
/** A guest must send at least this share of the total with their first transfer. */
export const MIN_PAY_RATE = 0.3;

export const minDue = (totalRwf: number) => Math.max(1, Math.ceil(totalRwf * MIN_PAY_RATE));
export const subscriptionFee = (totalRwf: number) => Math.round(totalRwf * SUBSCRIPTION_RATE);

const RELEASED: BookingStatus[] = ['Canceled', 'Declined', 'Expired', 'Refunded'];
export const occupiesInventory = (status: BookingStatus) => !RELEASED.includes(status);

const PAID_FEE: BookingStatus[] = ['Confirmed', 'RefundPending'];

export function bookingsForListing(bookings: Booking[], listingId: string) {
  return bookings.filter((booking) => booking.businessId === listingId || booking.targetId === listingId);
}

/** 10% platform fee already taken from confirmed (and not fully refunded) bookings. */
export function subscriptionsPaid(bookings: Booking[]) {
  return bookings.reduce((sum, booking) => (PAID_FEE.includes(booking.status) ? sum + subscriptionFee(booking.totalRwf) : sum), 0);
}
