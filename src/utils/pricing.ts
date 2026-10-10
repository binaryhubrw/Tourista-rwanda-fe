import type { Business, PriceLevel, Service } from '@/types';

const guidedFees = [10000, 30000, 80000];

/** Price of a licensed local guide for one day, by the place's price level. */
export const guidedVisitPrice = (level: PriceLevel) => guidedFees[level - 1];

/**
 * How a service is charged:
 * - stay:      per night × nights × rooms (check-in / check-out)
 * - rental:    per day × days × quantity (first / last day)
 * - perPerson: per person × people (single date)
 * - perUnit:   per item/group/plate × quantity (single date)
 */
export type PricingMode = 'stay' | 'rental' | 'perPerson' | 'perUnit';

export function pricingMode(unit: string): PricingMode {
  if (unit === 'per night') return 'stay';
  if (unit === 'per day') return 'rental';
  if (unit === 'per person') return 'perPerson';
  return 'perUnit';
}

export const isRoom = (s: Service) => pricingMode(s.unit) === 'stay';
export const hasDateRange = (s: Service) => ['stay', 'rental'].includes(pricingMode(s.unit));

const DAY = 86_400_000;
const parse = (iso: string) => new Date(`${iso}T00:00:00`).getTime();

/** Nights between check-in and check-out. */
export const nightsBetween = (start: string, end: string) => (start && end ? Math.max(0, Math.round((parse(end) - parse(start)) / DAY)) : 0);

export const addDaysIso = (iso: string, days: number) => new Date(parse(iso) + days * DAY + 12 * 3_600_000).toISOString().slice(0, 10);

export interface Quote {
  mode: PricingMode;
  /** Nights (stay) or days (rental); 1 otherwise. */
  periods: number;
  /** Rooms / items / people charged. */
  units: number;
  total: number;
}

export function quote(service: Service, input: { start: string; end?: string; units: number; people: number }): Quote {
  const mode = pricingMode(service.unit);
  const periods = mode === 'stay' ? nightsBetween(input.start, input.end ?? '') : mode === 'rental' ? (input.end ? nightsBetween(input.start, input.end) + 1 : 0) : 1;
  const units = mode === 'perPerson' ? input.people : input.units;
  return { mode, periods, units, total: service.priceRwf * Math.max(periods, 0) * Math.max(units, 0) };
}

export const unitNoun = (mode: PricingMode, n: number) =>
  mode === 'stay' ? (n === 1 ? 'room' : 'rooms') : mode === 'perPerson' ? (n === 1 ? 'person' : 'people') : n === 1 ? 'unit' : 'units';

export const periodNoun = (mode: PricingMode, n: number) => (mode === 'stay' ? (n === 1 ? 'night' : 'nights') : n === 1 ? 'day' : 'days');

/** Cheapest bookable price on a listing, preferring room rates for stays. */
export function fromPrice(b: Pick<Business, 'services'>) {
  const rooms = b.services.filter(isRoom);
  const pool = rooms.length ? rooms : b.services;
  if (!pool.length) return null;
  const s = pool.reduce((a, c) => (c.priceRwf < a.priceRwf ? c : a));
  return { priceRwf: s.priceRwf, unit: s.unit };
}
