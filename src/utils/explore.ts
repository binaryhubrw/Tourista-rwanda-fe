import type { Booking, Business, Experience, Interest, Location, PriceLevel, Service } from '@/types';
import { availableServices, hasAvailability } from '@/utils/availability';
import { fromPrice } from '@/utils/pricing';

export type ExploreKind = 'destination' | 'experience' | 'accommodation' | 'restaurant' | 'guide' | 'business' | 'service';

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

const businessKind = (b: Business): ExploreKind =>
  b.category === 'Accommodation' ? 'accommodation' : b.category === 'Restaurants' ? 'restaurant' : b.category === 'Tour Guides' ? 'guide' : 'business';

const businessInterests = (b: Business): Interest[] =>
  b.category === 'Restaurants' || b.category === 'Local Products' ? ['Food'] :
  b.category === 'Handcrafts' || b.category === 'Community Tourism' ? ['Culture'] :
  b.category === 'Transportation' ? ['Adventure'] : b.category === 'Accommodation' ? ['Relaxation', 'Nature'] : ['Culture', 'Nature'];

export function buildExploreItems(locations: Location[], experiences: Experience[], businesses: Business[], bookings: Booking[] = []): ExploreItem[] {
  const provinceOf = (locationId: string) => locations.find((l) => l.id === locationId)?.province ?? 'Rwanda';
  const openBusinesses = businesses.filter((business) => hasAvailability(business, bookings));
  const serviceItems = openBusinesses.flatMap((business) => availableServices(business.services, bookings).map<ExploreItem>((service) => ({
    key: `s-${service.id}`, type: 'service', node: service, business, kind: 'service', title: `${service.category ?? service.name} · ${business.name}`,
    text: `${service.name} ${service.category ?? ''} ${service.description} ${business.name} ${business.district} ${fromPrice({ services: [service] })?.priceRwf ?? ''}`,
    rating: business.rating, reviewCount: business.reviewCount, province: provinceOf(business.locationId), priceLevel: business.priceLevel,
    interests: businessInterests(business), sustainable: business.badges.length > 0, createdAt: business.createdAt, popularity: business.reviewCount * 20,
  })));
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
        text: `${b.name} ${b.listingKind ?? b.category} ${b.district} ${b.description} ${services.map((service) => `${service.name} ${service.category ?? ''} ${service.description}`).join(' ')} ${b.badges.join(' ')} ${place ? locationHaystack(place) : ''}`,
        rating: b.rating, reviewCount: b.reviewCount, province: provinceOf(b.locationId), priceLevel: b.priceLevel, interests: businessInterests(b),
        sustainable: b.badges.length > 0, createdAt: b.createdAt, popularity: b.reviewCount * 40,
      };
    }),
    ...serviceItems,
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
    const index = FEATURED_KINDS.indexOf(item.node.listingKind ?? '');
    return index >= 0 ? index : last;
  }
  if (item.type === 'service') {
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
