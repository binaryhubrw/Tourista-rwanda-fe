import type { SearchResult } from '@/types';
import { USE_MOCK } from './config';
import { api } from './apiClient';
import { delay, read } from './mockDb';
import { formatRwf } from '@/utils/format';
import { availableServices, hasAvailability } from '@/utils/availability';
import { listingKindOf } from '@/utils/catalog';

export type SearchScope = 'all' | 'destinations' | 'experiences' | 'accommodations' | 'restaurants' | 'businesses';

const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** Builds the full search index from every collection. */
function buildIndex(): (SearchResult & { haystack: string; scope: SearchScope })[] {
  const locations = read('locations').map((l) => ({
    id: l.id, type: 'location' as const, title: l.name, subtitle: `${l.district}, ${l.province}`, image: l.image,
    href: `/destinations/${l.id}`, rating: l.rating, category: l.category, scope: 'destinations' as SearchScope,
    haystack: normalize([l.name, l.district, l.province, l.category, l.shortDescription, ...l.interests, ...l.thingsToDo].join(' ')),
  }));
  const experiences = read('experiences').map((e) => ({
    id: e.id, type: 'experience' as const, title: e.title, subtitle: e.locationName, image: e.image,
    href: `/experiences/${e.id}`, rating: e.rating, category: e.type, scope: 'experiences' as SearchScope,
    haystack: normalize([e.title, e.type, e.locationName, e.description, e.hostName, ...e.interests].join(' ')),
  }));
  const bookings = read('bookings');
  const businesses = read('businesses').filter((b) => hasAvailability(b, bookings)).flatMap((b) => {
    const kind = listingKindOf(b);
    const open = availableServices(b.services, bookings);
    const listing = {
      id: b.id, type: 'business' as const, title: b.name, subtitle: `${kind} in ${b.district}`, image: b.image,
      href: `/businesses/${b.id}`, rating: b.rating, category: kind,
      description: b.description,
      priceLabel: open[0] ? `From ${formatRwf(Math.min(...open.map((service) => service.priceRwf)))}` : undefined,
      scope: (b.category === 'Accommodation' ? 'accommodations' : b.category === 'Restaurants' ? 'restaurants' : 'businesses') as SearchScope,
      haystack: normalize([b.name, kind, b.category, b.district, b.description, b.ownerName, ...b.badges, ...open.map((service) => `${service.name} ${service.category ?? ''} ${service.description}`)].join(' ')),
    };
    const services = open.map((service) => ({
      id: service.id, type: 'business' as const, title: service.name, subtitle: `${b.name} · ${b.district}`, image: b.image,
      href: `/businesses/${b.id}#offer-${service.id}`, rating: b.rating, category: service.category ?? kind,
      description: service.description, priceLabel: `${formatRwf(service.priceRwf)} ${service.unit}`,
      scope: listing.scope,
      haystack: normalize([service.name, service.category ?? '', service.description, b.name, kind, b.district].join(' ')),
    }));
    return [listing, ...services];
  });
  return [...locations, ...experiences, ...businesses];
}

export function searchSync(query: string, scope: SearchScope = 'all', limit = 50): SearchResult[] {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return buildIndex()
    .filter((r) => scope === 'all' || r.scope === scope || (scope === 'businesses' && r.type === 'business'))
    .map((r) => {
      const title = normalize(r.title);
      const hits = terms.filter((t) => r.haystack.includes(t)).length;
      const score = hits === terms.length ? hits * 2 + (title.startsWith(terms[0]) ? 3 : title.includes(terms[0]) ? 2 : 0) + r.rating / 5 : 0;
      return { r, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ r: { haystack: _h, scope: _s, ...rest } }) => rest);
}

export async function search(query: string, scope: SearchScope = 'all'): Promise<SearchResult[]> {
  if (!USE_MOCK) return api.get<SearchResult[]>(`/search/?q=${encodeURIComponent(query)}&scope=${scope}`);
  await delay(250);
  return searchSync(query, scope);
}
