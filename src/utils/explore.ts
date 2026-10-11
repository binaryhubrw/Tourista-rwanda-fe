import type { Booking, Business, Experience, Interest, Location, PriceLevel, Service } from '@/types';
import { availableServices, hasAvailability } from '@/utils/availability';

export type ExploreKind = 'destination' | 'experience' | 'accommodation' | 'restaurant' | 'guide' | 'business' | 'service' | 'vehicle';

export type ExploreItem = {
  key: string;
  kind: ExploreKind;
  title: string;
  text: string;
  rating: number;
  reviewCount: number;
  province: string;
  priceLevel: PriceLevel;
  interests: Interest[];
  sustainable: boolean;
  createdAt: string;
  popularity: number;
} & (
  | { type: 'location'; node: Location }
  | { type: 'experience'; node: Experience }
  | { type: 'business'; node: Business }
  | { type: 'service'; node: Service; business: Business }
);

export function locationHaystack(location: Location) {
  return `${location.name} ${location.district} ${location.province} ${location.shortDescription} ${location.description} ${location.category} ${location.thingsToDo.join(' ')}`;
}

export function termsMatch(haystack: string, query: string) {
  const text = haystack.toLowerCase();
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  return terms.every((term) => text.includes(term) || (term.endsWith('s') && term.length > 3 && text.includes(term.slice(0, -1))));
}

export type ExploreScope = 'hotels' | 'food' | 'vehicles' | 'services';

export const EXPLORE_SCOPES: { id: ExploreScope; label: string }[] = [
  { id: 'hotels', label: 'Hotels' },
  { id: 'food', label: 'Food' },
  { id: 'vehicles', label: 'Vehicles' },
  { id: 'services', label: 'Services' },
];

const SCOPE_ALIASES: Record<string, ExploreScope> = {
  hotels: 'hotels',
  food: 'food',
  vehicles: 'vehicles',
  services: 'services',
  accommodations: 'hotels',
  accommodation: 'hotels',
  restaurants: 'food',
  restaurant: 'food',
  cars: 'vehicles',
  vehicle: 'vehicles',
  businesses: 'services',
};

export function normalizeExploreScope(raw: string | null | undefined): ExploreScope | '' {
  if (!raw) return '';
  return SCOPE_ALIASES[raw] ?? '';
}

export function exploreScopeHref(scope: ExploreScope) {
  return `/explore?scope=${scope}#explore-listings`;
}

const ROOM_FOOD_VEHICLE = new Set(['room', 'food', 'vehicle']);

/** Wellness, tours and other extras — not rooms, meals or hire cars. */
export function isExploreService(service: Service) {
  return !service.group || !ROOM_FOOD_VEHICLE.has(service.group);
}

function serviceMenuLabel(service: Service) {
  return service.name.trim() || service.category?.trim() || '';
}

export function normalizeExploreService(raw: string | null | undefined): string {
  if (!raw) return '';
  try {
    return decodeURIComponent(raw).trim();
  } catch {
    return raw.trim();
  }
}

export function exploreServiceHref(service?: string) {
  const id = normalizeExploreService(service ?? '');
  if (!id) return exploreScopeHref('services');
  return `/explore?scope=services&service=${encodeURIComponent(id)}#explore-listings`;
}

export const CATALOG_EVENT = 'tourista-catalog';

/** Tell the navbar (and any other catalog listeners) that offerings changed. */
export function announceCatalog() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(CATALOG_EVENT));
}

/** Unique extras currently sold on any branch, for the Services dropdown. */
export function offeredServices(businesses: Business[]): { id: string; label: string }[] {
  const seen = new Map<string, string>();
  businesses.forEach((business) => {
    business.services.forEach((service) => {
      if (!isExploreService(service)) return;
      const label = serviceMenuLabel(service);
      if (!label) return;
      const key = label.toLowerCase();
      if (!seen.has(key)) seen.set(key, label);
    });
  });
  return [...seen.values()]
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    .map((label) => ({ id: label, label }));
}

/** Whether this branch actually sells the chosen service. */
export function businessHasService(business: Business, service: string): boolean {
  const needle = normalizeExploreService(service).toLowerCase();
  if (!needle) return false;
  return business.services.some((item) => {
    if (!isExploreService(item)) return false;
    return item.name.toLowerCase() === needle || item.category?.toLowerCase() === needle;
  });
}

/** Whether a business actually offers this catalog slice (rooms, meals, cars or extra services). */
export function businessMatchesScope(business: Business, scope: ExploreScope): boolean {
  const groups = new Set(business.services.map((service) => service.group));
  if (scope === 'hotels') return business.category === 'Accommodation' || groups.has('room');
  if (scope === 'food') return business.category === 'Restaurants' || groups.has('food');
  if (scope === 'vehicles') return business.category === 'Transportation' || groups.has('vehicle');
  return groups.has('wellness') || groups.has('activity')
    || business.category === 'Tour Guides'
    || business.category === 'Handcrafts'
    || business.category === 'Local Products'
    || business.category === 'Community Tourism';
}

const businessKind = (b: Business): ExploreKind =>
  b.category === 'Accommodation' ? 'accommodation' : b.category === 'Restaurants' ? 'restaurant' : b.category === 'Tour Guides' ? 'guide' : 'business';

const businessInterests = (b: Business): Interest[] =>
  b.category === 'Restaurants' || b.category === 'Local Products' ? ['Food'] :
  b.category === 'Handcrafts' || b.category === 'Community Tourism' ? ['Culture'] :
  b.category === 'Transportation' ? ['Adventure'] : b.category === 'Accommodation' ? ['Relaxation', 'Nature'] : ['Culture', 'Nature'];

export function buildExploreItems(locations: Location[], experiences: Experience[], businesses: Business[], bookings: Booking[] = []): ExploreItem[] {
  const provinceOf = (locationId: string) => locations.find((l) => l.id === locationId)?.province ?? 'Rwanda';
  const openBusinesses = businesses.filter((business) => hasAvailability(business, bookings));
  const vehicleItems = openBusinesses.flatMap((business) =>
    availableServices(business.services, bookings)
      .filter((service) => service.group === 'vehicle')
      .map<ExploreItem>((service) => ({
        key: `v-${service.id}`, type: 'service', node: service, business, kind: 'vehicle',
        title: `${service.brand ? `${service.brand} ` : ''}${service.name}`,
        text: `${service.name} ${service.brand ?? ''} ${service.category ?? ''} ${service.description} car vehicle hire rental ${business.name} ${business.district}`,
        rating: business.rating, reviewCount: business.reviewCount, province: provinceOf(business.locationId), priceLevel: business.priceLevel,
        interests: ['Adventure'], sustainable: business.badges.length > 0, createdAt: business.createdAt, popularity: business.reviewCount * 25,
      })),
  );
  return [
    ...locations.map<ExploreItem>((l) => ({
      key: `l-${l.id}`, type: 'location', node: l, kind: 'destination', title: l.name, text: `${l.name} ${l.district} ${l.shortDescription} ${l.description} ${l.category} ${l.thingsToDo.join(' ')}`,
      rating: l.rating, reviewCount: l.reviewCount, province: l.province, priceLevel: l.priceLevel, interests: l.interests,
      sustainable: l.sustainability.length > 0 && (l.isHiddenGem || l.category === 'National Park'), createdAt: l.createdAt, popularity: l.visitsLastYear,
    })),
    ...experiences.map<ExploreItem>((e) => ({
      key: `e-${e.id}`, type: 'experience', node: e, kind: 'experience', title: e.title, text: `${e.title} ${e.type} ${e.locationName} ${e.description}`,
      rating: e.rating, reviewCount: e.reviewCount, province: provinceOf(e.locationId), priceLevel: e.priceRwf < 20000 ? 1 : e.priceRwf < 50000 ? 2 : 3,
      interests: e.interests, sustainable: e.communityLed, createdAt: e.createdAt, popularity: e.reviewCount * 40,
    })),
    ...openBusinesses.map<ExploreItem>((b) => {
      const place = locations.find((location) => location.id === b.locationId);
      const services = availableServices(b.services, bookings);
      return {
        key: `b-${b.id}`, type: 'business', node: { ...b, services }, kind: businessKind(b), title: b.name,
        text: `${b.name} ${b.listingKind ?? b.category} ${b.district} ${b.description} ${services.map((service) => `${service.name} ${service.brand ?? ''} ${service.category ?? ''} ${service.description} ${service.group ?? ''}`).join(' ')} ${b.badges.join(' ')} ${place ? locationHaystack(place) : ''}`,
        rating: b.rating, reviewCount: b.reviewCount, province: provinceOf(b.locationId), priceLevel: b.priceLevel, interests: businessInterests(b),
        sustainable: b.badges.length > 0, createdAt: b.createdAt, popularity: b.reviewCount * 40,
      };
    }),
    ...vehicleItems,
  ];
}

export type SortKey = 'popular' | 'rating' | 'newest' | 'recommended';

export const sortOptions: { value: SortKey; label: string }[] = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'popular', label: 'Most popular' },
  { value: 'rating', label: 'Highest rated' },
  { value: 'newest', label: 'Newest' },
];

/** Home page order when the sort is Recommended. Later kinds keep the normal ranking. */
const FEATURED_KINDS = ['House', 'Hotel', 'Lodge', 'Guesthouse', 'Restaurant', 'Bar', 'Massage'];

export function featuredRank(item: ExploreItem): number {
  const last = FEATURED_KINDS.length;
  if (item.type === 'business') {
    if (item.node.id === 'demo-kigali-car-hire') return 0;
    const index = FEATURED_KINDS.indexOf(item.node.listingKind ?? '');
    return index >= 0 ? index : last;
  }
  if (item.type === 'service') {
    if (item.kind === 'vehicle') return 0;
    if (item.node.category === 'Bar') return FEATURED_KINDS.indexOf('Bar');
    if (item.node.category === 'Massage') return FEATURED_KINDS.indexOf('Massage');
  }
  return last;
}

export function sortItems<T extends { rating: number; reviewCount: number; createdAt: string; popularity: number; sustainable?: boolean }>(items: T[], sort: SortKey): T[] {
  const copy = [...items];
  switch (sort) {
    case 'popular': return copy.sort((a, b) => b.popularity - a.popularity);
    case 'rating': return copy.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
    case 'newest': return copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    default:
      // Recommended: rating weighted by review volume, with a boost for sustainable options.
      return copy.sort((a, b) => score(b) - score(a));
  }
  function score(x: T) {
    return x.rating * Math.log10(x.reviewCount + 10) + (x.sustainable ? 0.6 : 0);
  }
}
