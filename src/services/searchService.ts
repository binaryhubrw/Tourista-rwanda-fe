import type { SearchResult } from '@/types';
import { USE_MOCK } from './config';
import { api } from './apiClient';
import { delay, read } from './mockDb';
import { formatRwf } from '@/utils/format';
import { availableServices, hasAvailability } from '@/utils/availability';
import { listingKindOf } from '@/utils/catalog';
import { locationHaystack, termsMatch } from '@/utils/explore';

export type SearchScope = 'all' | 'accommodations' | 'restaurants' | 'businesses';

const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** Builds a business-only search index, including the place each listing sits in. */
function buildIndex(): (SearchResult & { haystack: string; scope: SearchScope; locationId: string; district: string; matchedServices?: string[] })[] {
  const locations = read('locations');
  const bookings = read('bookings');
  return read('businesses').filter((b) => hasAvailability(b, bookings)).map((b) => {
    const kind = listingKindOf(b);
    const open = availableServices(b.services, bookings);
    const place = locations.find((location) => location.id === b.locationId);
    const matched = open.map((service) => service.category ?? service.name).filter(Boolean);
    return {
      id: b.id, type: 'business' as const, title: b.name, subtitle: `${kind} in ${b.district}`, image: b.image,
      href: `/businesses/${b.id}`, rating: b.rating, category: kind,
      description: b.description,
      priceLabel: open[0] ? `From ${formatRwf(Math.min(...open.map((service) => service.priceRwf)))}` : undefined,
      scope: (b.category === 'Accommodation' ? 'accommodations' : b.category === 'Restaurants' ? 'restaurants' : 'businesses') as SearchScope,
      locationId: b.locationId,
      district: b.district,
      haystack: normalize([b.name, kind, b.category, b.district, b.description, b.ownerName, ...b.badges, ...open.map((service) => `${service.name} ${service.category ?? ''} ${service.description}`), place ? locationHaystack(place) : ''].join(' ')),
      matchedServices: matched,
    };
  });
}

export function searchSync(query: string, scope: SearchScope = 'all', limit = 50): SearchResult[] {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const placeHits = read('locations').filter((location) => termsMatch(locationHaystack(location), query));
  return buildIndex()
    .filter((r) => scope === 'all' || r.scope === scope || (scope === 'businesses' && r.type === 'business'))
    .map((r) => {
      const title = normalize(r.title);
      const hits = terms.filter((t) => r.haystack.includes(t) || (t.endsWith('s') && t.length > 3 && r.haystack.includes(t.slice(0, -1)))).length;
      const nearPlace = placeHits.some((place) => r.locationId === place.id || r.district === place.district);
      const serviceHit = (r.matchedServices ?? []).some((name) => terms.some((t) => normalize(name).includes(t)));
      const score = (hits === terms.length || nearPlace)
        ? (hits || 1) * 2 + (title.startsWith(terms[0]) ? 3 : title.includes(terms[0]) ? 2 : 0) + (serviceHit ? 2 : 0) + (nearPlace ? 1 : 0) + r.rating / 5
        : 0;
      return { r, score, serviceHit };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ r, serviceHit }) => {
      const { haystack: _h, scope: _s, matchedServices, locationId: _l, district: _d, ...rest } = r;
      const match = (matchedServices ?? []).find((name) => terms.some((t) => normalize(name).includes(t)));
      return { ...rest, description: serviceHit && match ? `Offers ${match}. ${rest.description}` : rest.description };
    });
}

export async function search(query: string, scope: SearchScope = 'all'): Promise<SearchResult[]> {
  if (!USE_MOCK) return api.get<SearchResult[]>(`/search/?q=${encodeURIComponent(query)}&scope=${scope}`);
  await delay(250);
  return searchSync(query, scope);
}
