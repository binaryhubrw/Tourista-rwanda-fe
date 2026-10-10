import type { Booking, BookingStatus, Payment, PaymentMethod, Service } from '@/types';
import { usersSeed } from './users';
import { businessesSeed } from './businesses';
import { experiencesSeed } from './experiences';
import { pricingMode } from '@/utils/pricing';

/**
 * Demo bookings, generated deterministically (seeded PRNG) relative to today so
 * dashboards always show a full year of activity. Confirmed bookings are paid;
 * Pending ones are awaiting payment.
 */

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20261009);
const pick = <T,>(list: T[]) => list[Math.floor(rand() * list.length)];
const between = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);

interface Target {
  id: string;
  name: string;
  type: Booking['targetType'];
  businessId?: string;
  services: Service[];
}

const listing = (id: string): Target => {
  const b = businessesSeed.find((x) => x.id === id)!;
  return { id: b.id, name: b.name, type: 'business', businessId: b.id, services: b.services };
};

const ownerListings = businessesSeed.filter((b) => b.ownerId === 'user-business-1').map((b) => listing(b.id));
const otherTargets: Target[] = [
  ...businessesSeed.filter((b) => b.ownerId !== 'user-business-1' && b.services.length).map((b) => listing(b.id)),
  ...experiencesSeed.slice(0, 6).map((e) => ({ id: e.id, name: e.title, type: 'experience' as const, services: [{ id: 'main', name: e.title, description: e.duration, priceRwf: e.priceRwf, unit: 'per person' }] })),
];

const tourist = usersSeed.find((u) => u.id === 'user-tourist-1')!;
const guests = usersSeed.filter((u) => u.role === 'tourist' && u.id !== tourist.id);

const today = new Date();
today.setHours(0, 0, 0, 0);

const methods: PaymentMethod[] = ['mtn', 'mtn', 'airtel', 'card', 'card'];
let seq = 1000;

function payment(method: PaymentMethod, amountRwf: number, paidAt: Date, status: Payment['status']): Payment {
  const account = method === 'card' ? `Visa •••• ${between(1000, 9999)}` : `+250 7${method === 'mtn' ? pick(['8', '9']) : pick(['2', '3'])}${between(0, 9)} *** ${between(100, 999)}`;
  return { method, status, account, reference: `${method === 'card' ? 'CRD' : method === 'mtn' ? 'MOMO' : 'AIR'}-${(seq * 7919).toString(36).toUpperCase()}`, amountRwf, paidAt: paidAt.toISOString() };
}

function make(target: Target, customer: (typeof usersSeed)[number], createdDaysAgo: number): Booking {
  // Rooms are booked more often than add-ons.
  const rooms = target.services.filter((s) => pricingMode(s.unit) === 'stay');
  const service = rooms.length && rand() < 0.85 ? pick(rooms) : pick(target.services);
  const mode = pricingMode(service.unit);
  const created = addDays(today, -createdDaysAgo);
  const start = addDays(created, between(4, 45));

  let units = 1;
  let nights = 1;
  let people = between(1, 4);
  let end: Date | undefined;
  if (mode === 'stay') {
    nights = between(1, 5);
    units = Math.min(service.available ?? 1, between(1, 2));
    people = Math.max(1, Math.min((service.capacity ?? 2) * units, between(1, 4)));
    end = addDays(start, nights);
  } else if (mode === 'rental') {
    nights = between(1, 3);
    units = between(1, 3);
    end = addDays(start, nights - 1);
  } else if (mode === 'perPerson') {
    units = people;
  } else {
    units = between(1, 3);
  }
  const total = service.priceRwf * nights * units;

  const past = start < today;
  const roll = rand();
  const status: BookingStatus = past ? (roll < 0.86 ? 'Confirmed' : 'Canceled') : roll < 0.2 ? 'Pending' : roll < 0.92 ? 'Confirmed' : 'Canceled';
  const method = pick(methods);
  const paidAt = addDays(created, 0);
  seq += 1;

  return {
    id: `bk-${seq}`,
    userId: customer.id,
    customerName: customer.name,
    customerEmail: customer.email,
    customerPhone: customer.phone ?? `+250 78${between(0, 9)} ${between(100, 999)} ${between(100, 999)}`,
    targetId: target.id,
    targetType: target.type,
    targetName: target.name,
    businessId: target.businessId,
    serviceId: service.id,
    serviceName: service.name,
    date: iso(start),
    endDate: end && iso(end),
    nights: mode === 'stay' || mode === 'rental' ? nights : undefined,
    units,
    unitPriceRwf: service.priceRwf,
    people,
    totalRwf: total,
    status,
    payment: status === 'Confirmed' ? payment(method, total, paidAt, 'Paid') : status === 'Canceled' && rand() < 0.6 ? payment(method, total, paidAt, 'Refunded') : undefined,
    createdAt: iso(created),
  };
}

const generated: Booking[] = [];

// The demo business owner's listings: steady demand over the past year, plus a busier recent stretch.
for (let i = 0; i < 52; i++) generated.push(make(pick(ownerListings), pick(guests), between(0, 360)));
for (let i = 0; i < 10; i++) generated.push(make(pick(ownerListings), pick(guests), between(0, 29)));
for (let i = 0; i < 6; i++) generated.push(make(pick(ownerListings), pick(guests), between(30, 59)));

// The demo tourist's own trips.
for (let i = 0; i < 14; i++) generated.push(make(i % 4 === 0 ? pick(ownerListings) : pick(otherTargets), tourist, between(2, 330)));

// Everyone else, across the rest of the platform.
for (let i = 0; i < 70; i++) generated.push(make(pick(otherTargets), pick(guests), between(0, 360)));

export const bookingsSeed: Booking[] = generated.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
