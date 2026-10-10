import type { Booking, BookingStatus, Payment, Service } from '@/types';
import { USE_MOCK } from './config';
import { api } from './apiClient';
import { delay, notFound, read, write } from './mockDb';
import { makeId } from '@/utils/id';
import { bookingLines, remaining } from '@/utils/availability';
import { addDaysIso, pricingMode } from '@/utils/pricing';

export async function getBookingById(id: string): Promise<Booking> {
  if (!USE_MOCK) return api.get<Booking>(`/bookings/${id}/`);
  await delay();
  return read('bookings').find((b) => b.id === id) ?? notFound('Booking');
}

function requestWindow(date: string, endDate: string | undefined, service: Service) {
  const mode = pricingMode(service.unit);
  if (!endDate) return { start: date, end: addDaysIso(date, 1) };
  return { start: date, end: mode === 'stay' ? endDate : addDaysIso(endDate, 1) };
}

export async function getBookings(filter: { userId?: string; businessIds?: string[] } = {}): Promise<Booking[]> {
  if (!USE_MOCK) return api.get<Booking[]>(filter.userId ? '/bookings/' : '/bookings/?scope=business');
  await delay();
  return read('bookings')
    .filter((b) => (!filter.userId || b.userId === filter.userId) && (!filter.businessIds || (b.businessId && filter.businessIds.includes(b.businessId))))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export type BookingInput = Omit<Booking, 'id' | 'status' | 'createdAt' | 'payment'>;

function assertAvailable(input: Pick<Booking, 'targetType' | 'businessId' | 'targetId' | 'date' | 'endDate' | 'lines' | 'serviceId' | 'serviceName' | 'units' | 'unitPriceRwf' | 'totalRwf'>, ignoreId?: string) {
  if (input.targetType !== 'business') return;
  const business = read('businesses').find((item) => item.id === (input.businessId ?? input.targetId));
  const existing = read('bookings').filter((item) => item.id !== ignoreId);
  for (const line of bookingLines(input)) {
    const service = business?.services.find((item) => item.id === line.serviceId);
    if (!service || service.available == null) continue;
    const window = requestWindow(input.date, input.endDate, service);
    const left = remaining(service, existing, window.start, window.end);
    if (line.units > left) {
      throw { message: left > 0 ? `Only ${left} ${service.name} left for those dates.` : `${service.name} is already booked for those dates.` };
    }
  }
}

/** Creates a booking. With a payment it is Confirmed straight away; without one it waits as Pending (unpaid). */
export async function createBooking(input: BookingInput, payment?: Payment): Promise<Booking> {
  if (!USE_MOCK) return api.post<Booking>('/bookings/', { ...input, payment });
  await delay(600);
  // Inventory is taken only after payment. Unpaid requests do not block anyone else.
  if (payment) assertAvailable(input);
  const booking: Booking = { ...input, id: makeId('bk'), status: payment ? 'Confirmed' : 'Pending', payment, createdAt: new Date().toISOString() };
  write('bookings', [booking, ...read('bookings')]);
  return booking;
}

function patch(id: string, change: (b: Booking) => Booking): Booking {
  const all = read('bookings');
  const idx = all.findIndex((b) => b.id === id);
  if (idx < 0) notFound('Booking');
  all[idx] = change(all[idx]);
  write('bookings', all);
  return all[idx];
}

/** Records a successful payment and confirms the booking. */
export async function payBooking(id: string, payment: Payment): Promise<Booking> {
  if (!USE_MOCK) return api.post<Booking>(`/bookings/${id}/pay/`, payment);
  await delay();
  const current = read('bookings').find((item) => item.id === id) ?? notFound('Booking');
  assertAvailable(current, id);
  return patch(id, (b) => ({ ...b, status: 'Confirmed', payment }));
}

/** Changes status. Canceling a paid booking refunds it. */
export async function updateBookingStatus(id: string, status: BookingStatus): Promise<Booking> {
  if (!USE_MOCK) return api.patch<Booking>(`/bookings/${id}/`, { status });
  await delay();
  return patch(id, (b) => ({
    ...b,
    status,
    payment: status === 'Canceled' && b.payment?.status === 'Paid' ? { ...b.payment, status: 'Refunded' } : b.payment,
  }));
}
