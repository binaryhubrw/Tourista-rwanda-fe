import type { Booking, BookingStatus, Payment, PaymentMethod, User } from '@/types';
import { api, apiBlob } from './apiClient';

export async function getBookingById(id: string): Promise<Booking> {
  return api.get<Booking>(`/bookings/${id}/`);
}

export async function getAvailability(filter: { businessId?: string; targetId?: string } = {}): Promise<Booking[]> {
  const qs = new URLSearchParams();
  if (filter.businessId) qs.set('businessId', filter.businessId);
  if (filter.targetId) qs.set('targetId', filter.targetId);
  const query = qs.toString();
  return api.get<Booking[]>(query ? `/bookings/availability/?${query}` : '/bookings/availability/');
}

export async function getBookings(filter: { userId?: string; businessIds?: string[] } = {}): Promise<Booking[]> {
  const qs = new URLSearchParams();
  if (filter.userId) qs.set('userId', filter.userId);
  if (filter.businessIds?.length) qs.set('businessIds', filter.businessIds.join(','));
  const query = qs.toString();
  return api.get<Booking[]>(query ? `/bookings/?${query}` : '/bookings/');
}

export type BookingInput = Omit<Booking, 'id' | 'status' | 'createdAt' | 'payment'>;

export async function createBooking(input: BookingInput, payment?: Payment): Promise<Booking> {
  return api.post<Booking>('/bookings/', payment ? { ...input, payment } : input);
}

export async function payBooking(id: string, payment: Pick<Payment, 'method' | 'account' | 'amountRwf'> & {
  senderName?: string;
  senderAccount?: string;
  screenshot?: string;
}): Promise<Booking> {
  return api.post<Booking>(`/bookings/${id}/pay/`, {
    method: payment.method,
    account: payment.account,
    senderName: payment.senderName,
    senderAccount: payment.senderAccount,
    screenshot: payment.screenshot,
    amountRwf: payment.amountRwf,
  });
}

export async function updateBookingStatus(id: string, status: BookingStatus): Promise<Booking> {
  return api.patch<Booking>(`/bookings/${id}/`, { status });
}

export async function hostDecideBooking(id: string, approve: boolean, reason?: string) {
  return api.post<Booking>(`/bookings/${id}/decision/`, { approve, reason });
}

export async function confirmHostReceivedPayment(id: string) {
  return api.post<Booking>(`/bookings/${id}/confirm-payment/`, {});
}

export async function submitOfflinePayment(
  id: string,
  input: { method: PaymentMethod; senderName: string; senderAccount: string; screenshot: string; amountRwf: number; sentTo: string; sentToLabel: string },
) {
  return payBooking(id, {
    method: input.method,
    account: input.senderAccount,
    senderName: input.senderName,
    senderAccount: input.senderAccount,
    screenshot: input.screenshot,
    amountRwf: input.amountRwf,
  });
}

export function bookingBelongsToUser(booking: Pick<Booking, 'userId' | 'customerEmail'>, user: Pick<User, 'id' | 'email'>) {
  return booking.userId === user.id || booking.customerEmail.toLowerCase() === user.email.toLowerCase();
}

export async function downloadBookingInvoice(id: string) {
  return apiBlob(`/bookings/${id}/invoice/`);
}

export async function emailBookingInvoice(id: string) {
  return api.post<{ sentTo: string }>(`/bookings/${id}/invoice/send/`, {});
}
