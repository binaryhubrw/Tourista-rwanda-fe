import type { BusinessCategory, OfferingGroup, PropertyType, Service } from '@/types';
import { makeId } from '@/utils/id';

export const ROOM_CATEGORIES = ['Regular', 'VIP', 'VVIP', 'Premium', 'Diamond'] as const;
export const WELLNESS_CATEGORIES = ['Massage', 'Gym', 'Sauna', 'Spa', 'Yoga'] as const;
export const FOOD_CATEGORIES = ['Restaurant', 'Bar', 'Coffee shop'] as const;
export const DRINK_CATEGORIES = ['Beer', 'Wine', 'Cocktail', 'Soft drink'] as const;

export type RoomCategory = (typeof ROOM_CATEGORIES)[number];
export type WellnessCategory = (typeof WELLNESS_CATEGORIES)[number];
export type FoodCategory = (typeof FOOD_CATEGORIES)[number];
export type DrinkCategory = (typeof DRINK_CATEGORIES)[number];
export type ServiceStyle = 'table' | 'self' | 'both';
export type BookingMode = 'book' | 'walk-in' | 'both';

export const foodUnit = (category: string) => {
  if (category === 'Restaurant' || category === 'Table service') return 'per plate';
  if (category === 'Self-service') return 'per person';
  if (category === 'Coffee shop' || category === 'Coffee') return 'per cup';
  if (category === 'Snack') return 'per item';
  return 'per drink';
};

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
    if (category === 'Restaurant' || category === 'Table service') return 'A plated meal. Price is per plate.';
    if (category === 'Self-service') return 'Buffet or self-service. Price is per person.';
    if (category === 'Bar' || category === 'Beer' || category === 'Wine' || category === 'Cocktail' || category === 'Soft drink') return 'Starting price per drink. The bill depends on what is ordered.';
    if (category === 'Coffee') return 'Starting price per cup. Speciality drinks can cost more.';
    if (category === 'Snack') return 'Starting price per item.';
    return 'Coffee and a snack. Starting price per cup.';
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

export interface VenueDraft {
  style: ServiceStyle;
  platePrice: string;
  buffetPrice: string;
  bookable: BookingMode;
  seats: string;
  drinks: Record<string, string>;
  coffeeFrom: string;
  snackFrom: string;
}

export interface CatalogDraft {
  rooms: Record<string, OfferDraft>;
  wellness: Record<string, OfferDraft>;
  food: Record<string, OfferDraft>;
  extras: ExtraDraft[];
  venue: VenueDraft;
}

const blankOffer = (group: OfferingGroup, category: string, count: string): OfferDraft => ({
  enabled: false,
  price: '',
  count,
  description: offeringBlurb(group, category),
});

export function emptyVenue(): VenueDraft {
  return {
    style: 'table',
    platePrice: '',
    buffetPrice: '',
    bookable: 'both',
    seats: '',
    drinks: Object.fromEntries(DRINK_CATEGORIES.map((c) => [c, ''])),
    coffeeFrom: '',
    snackFrom: '',
  };
}

export function emptyCatalog(): CatalogDraft {
  return {
    rooms: Object.fromEntries(ROOM_CATEGORIES.map((c, i) => [c, blankOffer('room', c, String([8, 4, 2, 2, 1][i]))])),
    wellness: Object.fromEntries(WELLNESS_CATEGORIES.map((c) => [c, blankOffer('wellness', c, '8')])),
    food: Object.fromEntries(FOOD_CATEGORIES.map((c) => [c, blankOffer('food', c, '30')])),
    extras: [],
    venue: emptyVenue(),
  };
}

export function emptyExtra(): ExtraDraft {
  return { id: makeId('svc'), name: '', description: '', price: '', unit: 'per person', count: '' };
}

function findService(services: Service[], ...names: string[]) {
  return services.find((s) => names.includes(s.category ?? '') || names.includes(s.name));
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
    else if (group === 'food' && service.category && FOOD_CATEGORIES.includes(service.category as FoodCategory)) place(draft.food, service);
  }

  const table = findService(services, 'Table service', 'Restaurant');
  const buffet = findService(services, 'Self-service', 'Buffet');
  if (table && buffet) draft.venue.style = 'both';
  else if (buffet) draft.venue.style = 'self';
  else draft.venue.style = 'table';
  if (table) { draft.venue.platePrice = String(table.priceRwf); used.add(table.id); }
  if (buffet) { draft.venue.buffetPrice = String(buffet.priceRwf); used.add(buffet.id); }
  if (!table) {
    const plated = services.find((s) => s.unit === 'per plate');
    if (plated) { draft.venue.platePrice = String(plated.priceRwf); used.add(plated.id); }
  }

  for (const drink of DRINK_CATEGORIES) {
    const row = findService(services, drink);
    if (row) { draft.venue.drinks[drink] = String(row.priceRwf); used.add(row.id); }
  }
  const coffee = findService(services, 'Coffee', 'Coffee shop');
  const snack = findService(services, 'Snack');
  if (coffee) { draft.venue.coffeeFrom = String(coffee.priceRwf); used.add(coffee.id); }
  if (snack) { draft.venue.snackFrom = String(snack.priceRwf); used.add(snack.id); }

  const seated = services.find((s) => s.available && s.available > 0 && (s.group === 'food' || s.unit === 'per plate' || s.unit === 'per drink' || s.unit === 'per cup'));
  if (seated?.available) {
    draft.venue.seats = String(seated.available);
    draft.venue.bookable = seated.description.toLowerCase().includes('walk-in') ? 'walk-in' : 'both';
  } else if (table || buffet || coffee || snack || Object.values(draft.venue.drinks).some(Boolean)) {
    draft.venue.bookable = 'walk-in';
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

function venueSeats(draft: CatalogDraft) {
  const n = Math.round(Number(draft.venue.seats));
  return draft.venue.bookable !== 'walk-in' && Number.isFinite(n) && n > 0 ? { available: n } : {};
}

function bookingNote(mode: BookingMode) {
  if (mode === 'book') return ' Guests book a table ahead.';
  if (mode === 'walk-in') return ' Walk-in only. Guests do not book ahead.';
  return ' Guests can book a table or walk in.';
}

function pushNamed(
  out: Service[],
  existing: Service[],
  opts: { name: string; category: string; group: OfferingGroup; unit: string; price: number; description: string; extra?: Partial<Service> },
) {
  if (!(opts.price > 0)) return;
  const prev = existing.find((s) => s.category === opts.category || s.name === opts.name);
  out.push({
    id: prev?.id ?? makeId('svc'),
    name: opts.name,
    category: opts.category,
    group: opts.group,
    description: opts.description,
    priceRwf: Math.round(opts.price),
    unit: opts.unit,
    ...opts.extra,
  });
}

export function servicesFromCatalog(draft: CatalogDraft, existing: Service[] = [], kindId = ''): Service[] {
  const lodging = isLodgingKind(kindId);
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
      ...(group === 'room' ? { capacity: 1, bedType: '1 bed', amenities: prev?.amenities } : {}),
    });
  };

  if (lodging) ROOM_CATEGORIES.forEach((c) => push('room', c, draft.rooms[c], 'per night'));
  if (lodging || kindId === 'Wellness') WELLNESS_CATEGORIES.forEach((c) => push('wellness', c, draft.wellness[c], 'per person'));
  if (lodging) FOOD_CATEGORIES.forEach((c) => push('food', c, draft.food[c], foodUnit(c)));

  const v = draft.venue;
  const seats = venueSeats(draft);
  if (kindId === 'Restaurant') {
    if (v.style === 'table' || v.style === 'both') {
      pushNamed(out, existing, {
        name: 'Table service', category: 'Table service', group: 'food', unit: 'per plate',
        price: Number(v.platePrice), extra: seats,
        description: `A plated meal. Charged per plate.${bookingNote(v.bookable)}`,
      });
    }
    if (v.style === 'self' || v.style === 'both') {
      pushNamed(out, existing, {
        name: 'Self-service', category: 'Self-service', group: 'food', unit: 'per person',
        price: Number(v.buffetPrice), extra: seats,
        description: `Buffet or self-service. Charged per person.${bookingNote(v.bookable)}`,
      });
    }
  }
  if (kindId === 'Bar') {
    for (const drink of DRINK_CATEGORIES) {
      pushNamed(out, existing, {
        name: drink, category: drink, group: 'food', unit: 'per drink',
        price: Number(v.drinks[drink]), extra: seats,
        description: `Starting price per drink. What you pay depends on the drink.${bookingNote(v.bookable)}`,
      });
    }
  }
  if (kindId === 'Coffee shop') {
    pushNamed(out, existing, {
      name: 'Coffee', category: 'Coffee', group: 'food', unit: 'per cup',
      price: Number(v.coffeeFrom), extra: seats,
      description: `Starting price per cup. Speciality drinks can cost more.${bookingNote(v.bookable)}`,
    });
    pushNamed(out, existing, {
      name: 'Snack', category: 'Snack', group: 'food', unit: 'per item',
      price: Number(v.snackFrom), extra: seats,
      description: `Starting price per item.${bookingNote(v.bookable)}`,
    });
  }

  for (const extra of draft.extras) {
    if (extra.name.trim().length < 2 || !(Number(extra.price) > 0)) continue;
    const count = Math.round(Number(extra.count));
    out.push({
      id: extra.id || makeId('svc'),
      name: extra.name.trim(),
      description: extra.description.trim(),
      priceRwf: Math.round(Number(extra.price)),
      unit: extra.unit || 'per person',
      group: extra.unit === 'per night' ? 'room' : extra.unit === 'per plate' || extra.unit === 'per drink' || extra.unit === 'per cup' ? 'food' : 'activity',
      category: extra.name.trim(),
      ...(Number.isFinite(count) && count > 0 ? { available: count } : {}),
      ...(extra.unit === 'per night' ? { capacity: 1, bedType: '1 bed' } : {}),
    });
  }
  return out;
}

export function catalogErrors(draft: CatalogDraft, kindId: string): Record<string, string> {
  const lodging = isLodgingKind(kindId);
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
  if (lodging || kindId === 'Wellness') {
    for (const c of WELLNESS_CATEGORIES) if (check(`wellness.${c}`, draft.wellness[c], false)) any = true;
  }
  if (lodging) {
    for (const c of FOOD_CATEGORIES) if (check(`food.${c}`, draft.food[c], false)) any = true;
  }

  const v = draft.venue;
  const needsSeats = v.bookable === 'book' || v.bookable === 'both';
  if (kindId === 'Restaurant') {
    if (v.style === 'table' || v.style === 'both') {
      if (!(Number(v.platePrice) > 0)) errors.platePrice = 'Enter a typical plate price.';
      else any = true;
    }
    if (v.style === 'self' || v.style === 'both') {
      if (!(Number(v.buffetPrice) > 0)) errors.buffetPrice = 'Enter the self-service price per person.';
      else any = true;
    }
    if (needsSeats && !(Number(v.seats) >= 1)) errors.seats = 'Enter how many seats guests can book.';
  }
  if (kindId === 'Bar') {
    const priced = DRINK_CATEGORIES.filter((c) => Number(v.drinks[c]) > 0);
    if (!priced.length) errors.drinks = 'Enter a starting price for at least one kind of drink.';
    else any = true;
    if (needsSeats && !(Number(v.seats) >= 1)) errors.seats = 'Enter how many seats guests can book.';
  }
  if (kindId === 'Coffee shop') {
    if (!(Number(v.coffeeFrom) > 0) && !(Number(v.snackFrom) > 0)) errors.coffeeFrom = 'Enter a starting price for coffee or a snack.';
    else any = true;
    if (needsSeats && !(Number(v.seats) >= 1)) errors.seats = 'Enter how many seats guests can book.';
  }

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
