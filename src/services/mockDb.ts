import { locationsSeed } from '@/data/locations';
import { experiencesSeed } from '@/data/experiences';
import { businessesSeed } from '@/data/businesses';
import { reviewsSeed } from '@/data/reviews';
import { itinerariesSeed } from '@/data/itineraries';
import { bookingsSeed } from '@/data/bookings';
import { usersSeed } from '@/data/users';
import type { Booking, Business, Experience, Itinerary, Location, Review, User } from '@/types';

/**
 * In-browser stand-in for the backend. Collections persist in localStorage so
 * created itineraries, reviews, bookings and listings survive a page reload.
 */
interface Collections {
  locations: Location[];
  experiences: Experience[];
  businesses: Business[];
  reviews: Review[];
  itineraries: Itinerary[];
  bookings: Booking[];
  users: (User & { password: string })[];
}

const VERSION = 'v6';
const seeds: Collections = {
  locations: locationsSeed,
  experiences: experiencesSeed,
  businesses: businessesSeed,
  reviews: reviewsSeed,
  itineraries: itinerariesSeed,
  bookings: bookingsSeed,
  users: usersSeed,
};

const key = (name: keyof Collections) => `tourista.db.${VERSION}.${name}`;

export function read<K extends keyof Collections>(name: K): Collections[K] {
  try {
    const raw = localStorage.getItem(key(name));
    if (raw) return JSON.parse(raw) as Collections[K];
  } catch { /* fall through to seed */ }
  return structuredClone(seeds[name]);
}

export function write<K extends keyof Collections>(name: K, value: Collections[K]) {
  try {
    localStorage.setItem(key(name), JSON.stringify(value));
  } catch (e) {
    // Uploaded photos live in localStorage in demo mode, so the quota can run out.
    if (e instanceof DOMException && /quota/i.test(e.name + e.message)) {
      throw { message: 'Demo storage on this browser is full. Use fewer or smaller photos, or reset demo data in Settings.' };
    }
    /* storage disabled: keep in memory only */
  }
}

export function resetMockDb() {
  (Object.keys(seeds) as (keyof Collections)[]).forEach((n) => localStorage.removeItem(key(n)));
}

/** Simulated network latency so loading states are visible. */
export const delay = (ms = 350) => new Promise((r) => setTimeout(r, ms));

export function notFound(what: string): never {
  throw { message: `${what} was not found.`, status: 404 };
}
