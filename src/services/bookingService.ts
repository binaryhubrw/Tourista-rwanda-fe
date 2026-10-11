import type { Booking, BookingStatus, Payment } from '@/types';
import { api } from './apiClient';
import { getStoredUser } from './authService';
import {
  cancelDemoBooking,
  createDemoBooking,
  demoBooking,
  demoBookings,
  occupiesInventory,
  ownerConfirmPayment,
  ownerDecide,
  submitPaymentProof,
  upsertDemoBooking,
} from '@/demo/store';
import type { PaymentMethod } from '@/types';
import { isDemoTouristBooking } from '@/demo/activity';

function mergeBookings(remote: Booking[]) {
  const demo = demoBookings();
  const ids = new Set(demo.map((b) => b.id));
  return [...demo, ...remote.filter((b) => !ids.has(b.id))];
}

async function remoteList(path: string) {
  try {
    return await api.get<Booking[]>(path);
  } catch {
    return [] as Booking[];
  }
}

export async function getBookingById(id: string): Promise<Booking> {
  const local = demoBooking(id);
  if (local) return local;
  return api.get<Booking>(`/bookings/${id}/`);
}

export async function getAvailability(filter: { businessId?: string; targetId?: string } = {}): Promise<Booking[]> {
  const qs = new URLSearchParams();
  if (filter.businessId) qs.set('businessId', filter.businessId);
  if (filter.targetId) qs.set('targetId', filter.targetId);
  const query = qs.toString();
  const remote = await remoteList(query ? `/bookings/availability/?${query}` : '/bookings/availability/');
  const local = demoBookings().filter((b) => {
    if (!occupiesInventory(b.status)) return false;
    if (filter.businessId && b.businessId !== filter.businessId && b.targetId !== filter.businessId) return false;
    if (filter.targetId && b.targetId !== filter.targetId && b.businessId !== filter.targetId) return false;
    return true;
  });
  return mergeBookings([...local, ...remote]);
}

export async function getBookings(filter: { userId?: string; businessIds?: string[] } = {}): Promise<Booking[]> {
  const qs = new URLSearchParams();
  if (filter.userId) qs.set('userId', filter.userId);
  if (filter.businessIds?.length) qs.set('businessIds', filter.businessIds.join(','));
  const query = qs.toString();
  const remote = await remoteList(query ? `/bookings/?${query}` : '/bookings/');
  let list = mergeBookings(remote);
  if (filter.userId) {
    const me = getStoredUser();
    list = list.filter((b) =>
      b.userId === filter.userId
      || (me && (b.userId === me.id || b.customerEmail.toLowerCase() === me.email.toLowerCase() || (me.role === 'tourist' && isDemoTouristBooking(b)))),
    );
  }
  if (filter.businessIds?.length) {
    const ids = new Set(filter.businessIds);
    list = list.filter((b) => (b.businessId && ids.has(b.businessId)) || ids.has(b.targetId));
  }
  return list;
}

export type BookingInput = Omit<Booking, 'id' | 'status' | 'createdAt' | 'payment'>;

export async function createBooking(input: BookingInput, payment?: Payment): Promise<Booking> {
  const booking = createDemoBooking({
    ...input,
    status: payment ? 'Confirmed' : 'Pending',
    ownerId: input.ownerId,
  });
  if (payment) return upsertDemoBooking({ ...booking, payment: { ...payment, status: 'Paid', ledger: 'approved', feeRwf: payment.feeRwf } });
  return booking;
}

export async function payBooking(id: string, payment: Payment): Promise<Booking> {
  if (demoBooking(id)) {
    return submitPaymentProof(id, {
      method: payment.method,
      senderName: payment.senderName ?? payment.account,
      senderAccount: payment.senderAccount ?? payment.account,
      screenshot: payment.screenshot ?? '',
      amountRwf: payment.amountRwf,
      sentTo: payment.sentTo ?? '',
      sentToLabel: payment.sentToLabel ?? '',
    });
  }
  return api.post<Booking>(`/bookings/${id}/pay/`, { method: payment.method, account: payment.account });
}

export async function updateBookingStatus(id: string, status: BookingStatus): Promise<Booking> {
  if (demoBooking(id)) {
    if (status === 'Canceled') return cancelDemoBooking(id);
    const b = demoBooking(id)!;
    return upsertDemoBooking({ ...b, status });
  }
  return api.patch<Booking>(`/bookings/${id}/`, { status });
}

export async function hostDecideBooking(id: string, approve: boolean, reason?: string) {
  return ownerDecide(id, approve, reason);
}

export async function confirmHostReceivedPayment(id: string) {
  return ownerConfirmPayment(id);
}

export async function submitOfflinePayment(
  id: string,
  input: { method: PaymentMethod; senderName: string; senderAccount: string; screenshot: string; amountRwf: number; sentTo: string; sentToLabel: string },
) {
  return submitPaymentProof(id, input);
}
