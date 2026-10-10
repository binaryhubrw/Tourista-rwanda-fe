import type { BusinessCategory, OfferingGroup, PropertyType, Service } from '@/types';
import { makeId } from '@/utils/id';

export const ROOM_CATEGORIES = ['Regular', 'VIP', 'VVIP', 'Premium', 'Diamond'] as const;
export const WELLNESS_CATEGORIES = ['Massage', 'Gym', 'Sauna', 'Spa', 'Yoga'] as const;
export const FOOD_CATEGORIES = ['Restaurant', 'Bar', 'Coffee shop'] as const;

export type RoomCategory = (typeof ROOM_CATEGORIES)[number];
export type WellnessCategory = (typeof WELLNESS_CATEGORIES)[number];
export type FoodCategory = (typeof FOOD_CATEGORIES)[number];

export interface ListingKind {
  id: string;
  category: BusinessCategory;
  propertyType?: PropertyType;
}

/** Every listing starts by choosing one of these kinds. */
export const LISTING_KINDS: ListingKind[] = [
  { id: 'Hotel', category: 'Accommodation', propertyType: 'Hotel' },
  { id: 'Lodge', category: 'Accommodation', propertyType: 'Lodge' },
  { id: 'Guesthouse', category: 'Accommodation', propertyType: 'Guesthouse' },
  { id: 'House', category: 'Accommodation', propertyType: 'House' },
  { id: 'Apartment', category: 'Accommodation', propertyType: 'Apartment' },
  { id: 'Restaurant', category: 'Restaurants' },
  { id: 'Bar', category: 'Restaurants' },
  { id: 'Coffee shop', category: 'Restaurants' },
  { id: 'Tour guide', category: 'Tour Guides' },
  { id: 'Transportation', category: 'Transportation' },
  { id: 'Handcraft', category: 'Handcrafts' },
  { id: 'Local product', category: 'Local Products' },
  { id: 'Community tourism', category: 'Community Tourism' },
  { id: 'Wellness', category: 'Community Tourism' },
];

export const kindById = (id: string) => LISTING_KINDS.find((k) => k.id === id);
export const isLodgingKind = (id: string) => kindById(id)?.category === 'Accommodation';

const ROOM_SLEEP: Record<string, number> = { Regular: 2, VIP: 2, VVIP: 3, Premium: 3, Diamond: 4 };

export function offeringBlurb(group: OfferingGroup, category: string) {
  if (group === 'room') return `${category} room with a private bathroom.`;
  if (group === 'wellness') {
    if (category === 'Massage') return 'A 60-minute massage.';
    if (category === 'Gym') return 'A session in the gym.';
    if (category === 'Sauna') return 'A private sauna session.';
    if (category === 'Spa') return 'A spa treatment.';
    return 'A yoga session.';
  }
  if (group === 'food') {
    if (category === 'Restaurant') return 'A meal in the restaurant.';
    if (category === 'Bar') return 'Drinks at the bar.';
    return 'Coffee and a snack.';
  }
  return '';
}

export interface OfferDraft {
  enabled: boolean;
  price: string;
  count: string;
  description: string;
}

export interface ExtraDraft {
  id: string;
  name: string;
  description: string;
  price: string;
  unit: string;
  count: string;
}

export interface CatalogDraft {
  rooms: Record<string, OfferDraft>;
  wellness: Record<string, OfferDraft>;
  food: Record<string, OfferDraft>;
  extras: ExtraDraft[];
}

const blankOffer = (group: OfferingGroup, category: string, count: string): OfferDraft => ({
  enabled: false,
  price: '',
  count,
  description: offeringBlurb(group, category),
});

export function emptyCatalog(): CatalogDraft {
  return {
    rooms: Object.fromEntries(ROOM_CATEGORIES.map((c, i) => [c, blankOffer('room', c, String([8, 4, 2, 2, 1][i]))])),
    wellness: Object.fromEntries(WELLNESS_CATEGORIES.map((c) => [c, blankOffer('wellness', c, '8')])),
    food: Object.fromEntries(FOOD_CATEGORIES.map((c) => [c, blankOffer('food', c, '30')])),
    extras: [],
  };
}

export function emptyExtra(): ExtraDraft {
  return { id: makeId('svc'), name: '', description: '', price: '', unit: 'per person', count: '' };
}

/** Rebuilds the registration form from services already saved on a listing. */
export function catalogFromServices(services: Service[]): CatalogDraft {
  const draft = emptyCatalog();
  const used = new Set<string>();
  const place = (bucket: Record<string, OfferDraft>, service: Service) => {
    const category = service.category;
    if (!category || !bucket[category] || bucket[category].enabled) return false;
    bucket[category] = {
      enabled: true,
      price: String(service.priceRwf),
      count: String(service.available ?? bucket[category].count),
      description: service.description || bucket[category].description,
    };
    used.add(service.id);
    return true;
  };

  for (const service of services) {
    const group = service.group ?? (service.unit === 'per night' ? 'room' : undefined);
    if (group === 'room') place(draft.rooms, service);
    else if (group === 'wellness') place(draft.wellness, service);
    else if (group === 'food') place(draft.food, service);
  }

  draft.extras = services.filter((s) => !used.has(s.id)).map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    price: String(s.priceRwf),
    unit: s.unit,
    count: s.available != null ? String(s.available) : '',
  }));
  return draft;
}

export function servicesFromCatalog(draft: CatalogDraft, existing: Service[] = [], lodging = false): Service[] {
  const out: Service[] = [];
  const push = (group: OfferingGroup, category: string, row: OfferDraft, unit: string) => {
    if (!row.enabled) return;
    const prev = existing.find((s) => (s.group === group || (group === 'room' && s.unit === 'per night')) && s.category === category);
    const count = Math.round(Number(row.count));
    out.push({
      id: prev?.id ?? makeId('svc'),
      name: category,
      category,
      group,
      description: row.description.trim(),
      priceRwf: Math.round(Number(row.price)),
      unit,
      ...(Number.isFinite(count) && count > 0 ? { available: count } : {}),
      ...(group === 'room' ? { capacity: prev?.capacity ?? ROOM_SLEEP[category] ?? 2, bedType: prev?.bedType, amenities: prev?.amenities } : {}),
    });
  };

  if (lodging) ROOM_CATEGORIES.forEach((c) => push('room', c, draft.rooms[c], 'per night'));
  WELLNESS_CATEGORIES.forEach((c) => push('wellness', c, draft.wellness[c], 'per person'));
  FOOD_CATEGORIES.forEach((c) => push('food', c, draft.food[c], 'per person'));

  for (const extra of draft.extras) {
    if (extra.name.trim().length < 2 || !(Number(extra.price) > 0)) continue;
    const count = Math.round(Number(extra.count));
    out.push({
      id: extra.id || makeId('svc'),
      name: extra.name.trim(),
      description: extra.description.trim(),
      priceRwf: Math.round(Number(extra.price)),
      unit: extra.unit || 'per person',
      group: extra.unit === 'per night' ? 'room' : 'activity',
      category: extra.name.trim(),
      ...(Number.isFinite(count) && count > 0 ? { available: count } : {}),
      ...(extra.unit === 'per night' ? { capacity: 2 } : {}),
    });
  }
  return out;
}

export function catalogErrors(draft: CatalogDraft, lodging: boolean): Record<string, string> {
  const errors: Record<string, string> = {};
  const check = (key: string, row: OfferDraft, needsCount: boolean) => {
    if (!row.enabled) return false;
    if (!(Number(row.price) > 0)) errors[`${key}.price`] = 'Enter a price in RWF.';
    if (row.description.trim().length < 8) errors[`${key}.description`] = 'Add a short description.';
    if (needsCount && !(Number(row.count) >= 1)) errors[`${key}.count`] = 'Enter how many.';
    return true;
  };

  let roomsOn = 0;
  let any = false;
  for (const c of ROOM_CATEGORIES) if (lodging && check(`rooms.${c}`, draft.rooms[c], true)) { roomsOn += 1; any = true; }
  for (const c of WELLNESS_CATEGORIES) if (check(`wellness.${c}`, draft.wellness[c], false)) any = true;
  for (const c of FOOD_CATEGORIES) if (check(`food.${c}`, draft.food[c], false)) any = true;
  draft.extras.forEach((extra, i) => {
    const started = extra.name.trim() || extra.price || extra.description.trim();
    if (!started) return;
    any = true;
    if (extra.name.trim().length < 2) errors[`extras.${i}.name`] = 'Name this service.';
    if (!(Number(extra.price) > 0)) errors[`extras.${i}.price`] = 'Enter a price in RWF.';
    if (extra.description.trim().length < 8) errors[`extras.${i}.description`] = 'Add a short description.';
  });

  if (lodging && roomsOn === 0) errors.rooms = 'Choose at least one room category, with a price and how many rooms you have.';
  if (!any) errors.catalog = 'Add a price for at least one room, service or place to eat.';
  return errors;
}

export function listingKindOf(business: { listingKind?: string; propertyType?: string; category: string }) {
  if (business.listingKind) return business.listingKind;
  if (business.propertyType) return business.propertyType;
  const match = LISTING_KINDS.find((k) => k.category === business.category && !k.propertyType);
  return match?.id ?? business.category;
}
