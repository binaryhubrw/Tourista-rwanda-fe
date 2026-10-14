import type { Booking, BookingLine, Business, Service } from '@/types';
import { occupiesInventory } from '@/utils/lifecycle';
import { addDaysIso, nightsBetween, pricingMode } from '@/utils/pricing';
import { todayIso } from '@/utils/format';
import { vehiclePlates } from '@/utils/catalog';

export function bookingLines(booking: Pick<Booking, 'lines' | 'serviceId' | 'serviceName' | 'units' | 'unitPriceRwf' | 'totalRwf'>): BookingLine[] {
  if (booking.lines?.length) return booking.lines;
  if (!booking.serviceId) return [];
  return [{
    serviceId: booking.serviceId,
    serviceName: booking.serviceName ?? 'Service',
    units: booking.units ?? 1,
    unitPriceRwf: booking.unitPriceRwf ?? 0,
    lineTotalRwf: booking.totalRwf,
  }];
}

/** Checkout morning is free for stays. A single date occupies that day only. */
export function occupiedUntil(booking: Pick<Booking, 'date' | 'endDate' | 'nights'>, service?: Pick<Service, 'unit'>) {
  if (!booking.endDate) return addDaysIso(booking.date, 1);
  const stay = service ? pricingMode(service.unit) === 'stay' : nightsBetween(booking.date, booking.endDate) === (booking.nights ?? -1);
  return stay ? booking.endDate : addDaysIso(booking.endDate, 1);
}

const overlaps = (start: string, end: string, otherStart: string, otherEnd: string) => start < otherEnd && otherStart < end;

/** Units already confirmed for this service between start (inclusive) and end (exclusive). */
export function reservedUnits(serviceId: string, bookings: Booking[], start: string, end: string, service?: Pick<Service, 'unit'>) {
  return bookings.reduce((sum, booking) => {
    if (!occupiesInventory(booking.status)) return sum;
    const line = bookingLines(booking).find((item) => item.serviceId === serviceId);
    if (!line) return sum;
    const until = occupiedUntil(booking, service);
    return overlaps(start, end, booking.date, until) ? sum + line.units : sum;
  }, 0);
}

/** Remaining units. Infinity when the offering does not have a fixed count. */
export function remaining(service: Service, bookings: Booking[], start: string, end: string) {
  if (service.available == null) return Number.POSITIVE_INFINITY;
  return Math.max(0, service.available - reservedUnits(service.id, bookings, start, end, service));
}

/** Plates already assigned to overlapping hires of this car type. */
export function reservedPlates(serviceId: string, bookings: Booking[], start: string, end: string, service?: Pick<Service, 'unit'>) {
  const taken: string[] = [];
  for (const booking of bookings) {
    if (!occupiesInventory(booking.status)) continue;
    const line = bookingLines(booking).find((item) => item.serviceId === serviceId);
    if (!line?.plateNumbers?.length) continue;
    const until = occupiedUntil(booking, service);
    if (overlaps(start, end, booking.date, until)) taken.push(...line.plateNumbers);
  }
  return taken;
}

/** Next free registration plates for a vehicle hire. */
export function assignVehiclePlates(service: Service, count: number, bookings: Booking[], start: string, end: string) {
  const fleet = vehiclePlates(service);
  if (!fleet.length) return [];
  const taken = new Set(reservedPlates(service.id, bookings, start, end, service));
  const reserved = reservedUnits(service.id, bookings, start, end, service);
  const anonymous = Math.max(0, reserved - taken.size);
  const free = fleet.filter((plate) => !taken.has(plate));
  return free.slice(anonymous, anonymous + Math.max(0, count));
}

export function eachIso(start: string, end: string) {
  const days: string[] = [];
  for (let day = start; day < end; day = addDaysIso(day, 1)) days.push(day);
  return days;
}

/** True when this offering is sold out that night or day — not merely short of the requested quantity. */
export function isDateTaken(service: Service, bookings: Booking[], iso: string, _units = 1) {
  const left = remaining(service, bookings, iso, addDaysIso(iso, 1));
  return Number.isFinite(left) && left <= 0;
}

export function isNightTakenFor(services: { service: Service; units: number }[], bookings: Booking[], iso: string) {
  return services.some(({ service, units }) => isDateTaken(service, bookings, iso, units));
}

export function isStayRangeTaken(services: { service: Service; units: number }[], bookings: Booking[], start: string, end: string) {
  if (!start || !end || end <= start) return true;
  return eachIso(start, end).some((iso) => isNightTakenFor(services, bookings, iso));
}

export interface OccupancySpan {
  start: string;
  end: string;
  units: number;
}

/** Upcoming confirmed stays for a room or service, for owner status. */
export function occupancySpans(service: Service, bookings: Booking[], from = todayIso()): OccupancySpan[] {
  const spans: OccupancySpan[] = [];
  for (const booking of bookings) {
    if (!occupiesInventory(booking.status)) continue;
    const line = bookingLines(booking).find((item) => item.serviceId === service.id);
    if (!line) continue;
    const until = occupiedUntil(booking, service);
    if (until <= from) continue;
    spans.push({ start: booking.date < from ? from : booking.date, end: until, units: line.units });
  }
  return spans.sort((a, b) => a.start.localeCompare(b.start));
}

export function roomStatus(service: Service, bookings: Booking[]) {
  const spans = occupancySpans(service, bookings);
  const stock = service.available ?? 0;
  if (!spans.length) return { tone: 'success' as const, label: 'Available', spans };
  const fully = spans.filter((span) => stock > 0 && reservedUnits(service.id, bookings, span.start, span.end, service) >= stock);
  if (fully.length && fully.length === spans.length) return { tone: 'danger' as const, label: 'Booked', spans };
  return { tone: 'warning' as const, label: 'Partly booked', spans };
}

export function openToday(service: Service, bookings: Booking[]) {
  const today = todayIso();
  return remaining(service, bookings, today, addDaysIso(today, 1)) > 0;
}

function bookingsForListingId(bookings: Booking[], listingId?: string) {
  if (!listingId) return bookings;
  return bookings.filter((booking) => booking.businessId === listingId || booking.targetId === listingId);
}

/** Check-in / check-out window. Checkout morning is free, same as a hotel stay. */
export function inventoryWindow(_service: Pick<Service, 'unit'> | undefined, start: string, end: string) {
  const checkout = !end || end <= start ? addDaysIso(start, 1) : end;
  return { start, end: checkout };
}

function freeOnDay(service: Service, bookings: Booking[], iso: string) {
  const dayEnd = addDaysIso(iso, 1);
  if (service.available != null && remaining(service, bookings, iso, dayEnd) <= 0) return false;
  if (service.group !== 'vehicle') return true;
  const fleet = vehiclePlates(service);
  if (!fleet.length) return true;
  return assignVehiclePlates(service, 1, bookings, iso, dayEnd).length > 0;
}

/** True when a traveller can still book this offering for the trip. Rooms and cars need every night; meals and extras need any day in the stay. */
export function isAvailableInRange(service: Service, bookings: Booking[], start?: string, end?: string, listingId?: string) {
  const mine = bookingsForListingId(bookings, listingId);
  if (!start) return openToday(service, mine);
  const span = inventoryWindow(service, start, end ?? '');
  if (span.end <= span.start) return false;
  const days = eachIso(span.start, span.end);
  if (!days.length) return false;
  const mode = pricingMode(service.unit);
  if (mode === 'stay' || mode === 'rental' || service.group === 'vehicle') {
    if (!days.every((iso) => freeOnDay(service, mine, iso))) return false;
    if (service.group === 'vehicle' && vehiclePlates(service).length) {
      return assignVehiclePlates(service, 1, mine, span.start, span.end).length > 0;
    }
    return true;
  }
  if (service.available == null) return true;
  return days.some((iso) => freeOnDay(service, mine, iso));
}

/** Services a traveller can still book. Without dates, that means today. */
export function availableServices(services: Service[], bookings: Booking[], start?: string, end?: string, listingId?: string) {
  return services.filter((service) => isAvailableInRange(service, bookings, start, end, listingId));
}

export function hasAvailability(business: Pick<Business, 'id' | 'services'>, bookings: Booking[], start?: string, end?: string) {
  return availableServices(business.services, bookings, start, end, business.id).length > 0;
}

export function bookingsForService(serviceId: string, bookings: Booking[]) {
  return bookings.filter((booking) => occupiesInventory(booking.status) && bookingLines(booking).some((line) => line.serviceId === serviceId));
}
