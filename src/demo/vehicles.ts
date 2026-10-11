import type { Business, Service } from '@/types';
import { images } from '@/data/images';
import type { PayoutTarget } from '@/utils/payment';

export const DEMO_HIRE_ID = 'demo-kigali-car-hire';
export const DEMO_INN_ID = 'demo-kigali-wheels-inn';
export const DEMO_HIRE_OWNER = 'demo-owner-hire';
export const DEMO_HIRE_COMPANY = 'Kigali Wheels';

let fleetPhoto = 0;
function nextFleetPhoto() {
  const photos = images.carFleet;
  return photos[fleetPhoto++ % photos.length];
}

function fleetCar(service: Service, plates: string[]): Service {
  const units = plates.map((plate) => ({ plate, image: nextFleetPhoto(), level: service.category }));
  return {
    ...service,
    image: units[0]?.image ?? service.image,
    plateNumber: plates[0],
    plates,
    available: plates.length,
    units,
  };
}

/** Stable demo fleet so landing, listing and booking always share the same car ids. */
export const DEMO_FLEET: Service[] = [
  fleetCar({ id: 'veh-demo-corolla', name: 'Corolla', brand: 'Toyota', category: 'Economy', description: 'Compact hire car for Kigali days and airport runs. Air conditioning and a full tank at pickup.', priceRwf: 45000, unit: 'per day', group: 'vehicle', capacity: 4, image: images.carCorolla }, ['RAD 201 A', 'RAD 202 A', 'RAD 203 A', 'RAD 204 A', 'RAD 205 A']),
  fleetCar({ id: 'veh-demo-xtrail', name: 'X-Trail', brand: 'Nissan', category: 'Standard', description: 'Family SUV for longer trips to Musanze or Lake Kivu. High clearance and luggage space.', priceRwf: 85000, unit: 'per day', group: 'vehicle', capacity: 5, image: images.carXtrail }, ['RAD 301 B', 'RAD 302 B', 'RAD 303 B', 'RAD 304 B']),
  fleetCar({ id: 'veh-demo-prado', name: 'Prado', brand: 'Toyota', category: 'VIP', description: 'Comfortable 4x4 with a driver option. Suited to park roads and lodge transfers.', priceRwf: 130000, unit: 'per day', group: 'vehicle', capacity: 7, image: images.carPrado }, ['RAD 401 C', 'RAD 402 C', 'RAD 403 C']),
  fleetCar({ id: 'veh-demo-landcruiser', name: 'Land Cruiser', brand: 'Toyota', category: 'VIP', description: 'Safari-ready 4x4 used for Akagera and volcano country. Roof hatch on request.', priceRwf: 150000, unit: 'per day', group: 'vehicle', capacity: 7, image: images.carLandcruiser }, ['RAD 411 C', 'RAD 412 C']),
  fleetCar({ id: 'veh-demo-vclass', name: 'V-Class', brand: 'Mercedes-Benz', category: 'Luxury', description: 'Executive van for airport, meetings and lodge transfers. Water and Wi-Fi on board.', priceRwf: 220000, unit: 'per day', group: 'vehicle', capacity: 7, image: images.carVclass }, ['RAD 501 E', 'RAD 502 E']),
  fleetCar({ id: 'veh-demo-coaster', name: 'Coaster', brand: 'Toyota', category: 'VVIP', description: '22-seat coach for groups. Driver included for the booked days.', priceRwf: 280000, unit: 'per day', group: 'vehicle', capacity: 22, image: images.carCoaster }, ['RAD 601 F', 'RAD 602 F']),
];

export const DEMO_PAYOUT: PayoutTarget = {
  businessName: 'Kigali Wheels',
  bankAccount: '4001234567890',
  mtnNumber: '0788123456',
  airtelNumber: '0733123456',
};

export function demoHireBusiness(place?: { locationId: string; district: string }): Business {
  return {
    id: DEMO_HIRE_ID,
    name: 'Kigali Wheels',
    ownerName: 'Eric Ndayisaba',
    ownerId: DEMO_HIRE_OWNER,
    category: 'Transportation',
    listingKind: 'Transportation',
    locationId: place?.locationId ?? 'loc-kigali',
    district: place?.district ?? 'Nyarugenge',
    description: 'Self-drive and chauffeur hire from Kigali. Economy to luxury, priced per day like hotel rooms. This listing is demo data so you can book a car and walk through host approval, payment and refunds.',
    image: images.car,
    gallery: [images.car, images.savanna, images.kigali],
    rating: 4.8,
    reviewCount: 64,
    badges: ['Community-owned'],
    phone: '+250 788 123 456',
    email: 'hire@kigaliwheels.rw',
    coordinates: { lat: -1.9441, lng: 30.0619 },
    services: DEMO_FLEET,
    priceLevel: 2,
    createdAt: '2026-01-12T08:00:00.000Z',
  };
}

export function demoInnBusiness(place?: { locationId: string; district: string }): Business {
  return {
    id: DEMO_INN_ID,
    name: 'Kigali Wheels Inn',
    ownerName: 'Eric Ndayisaba',
    ownerId: DEMO_HIRE_OWNER,
    category: 'Accommodation',
    listingKind: 'Guesthouse',
    propertyType: 'Guesthouse',
    locationId: place?.locationId ?? 'loc-kigali',
    district: place?.district ?? 'Nyarugenge',
    description: 'A 12-room guesthouse next to the Kigali Wheels yard. Drivers and self-drive guests stay here the night before an early airport or park departure.',
    image: images.hotel,
    gallery: [images.hotel, images.hotelExterior, images.kigali],
    rating: 4.6,
    reviewCount: 28,
    badges: ['Community-owned'],
    phone: '+250 788 123 457',
    email: 'inn@kigaliwheels.rw',
    coordinates: { lat: -1.9462, lng: 30.0588 },
    services: [
      { id: 'inn-std', name: 'Standard room', description: 'Queen bed, desk and en-suite shower. Street parking for the hired car.', priceRwf: 85000, unit: 'per night', group: 'room', category: 'Regular', capacity: 2, available: 8, bedType: 'Queen' },
      { id: 'inn-vip', name: 'Deluxe room', description: 'King bed, sitting area and a quiet courtyard view.', priceRwf: 140000, unit: 'per night', group: 'room', category: 'VIP', capacity: 2, available: 4, bedType: 'King' },
      { id: 'inn-breakfast', name: 'Breakfast', description: 'Buffet with fruit, eggs and Rwandan coffee, served from 6am.', priceRwf: 12000, unit: 'per person', group: 'food', category: 'Restaurant', available: 24 },
    ],
    priceLevel: 2,
    createdAt: '2026-02-01T08:00:00.000Z',
  };
}

export function demoStaffBranches(): Business[] {
  return [demoHireBusiness(), demoInnBusiness()];
}

/** Always put the demo hire company on the public list so cars show without an owner adding them. */
export function withDemoListings(list: Business[]): Business[] {
  const sample = list.find((b) => /kigali|gasabo|nyarugenge|kicukiro/i.test(b.district)) ?? list[0];
  const place = sample ? { locationId: sample.locationId, district: sample.district } : undefined;
  const hire = demoHireBusiness(place);
  const inn = demoInnBusiness(place);
  const rest = list.filter((b) => b.id !== DEMO_HIRE_ID && b.id !== DEMO_INN_ID);
  return [hire, inn, ...rest];
}

export function isDemoHire(id: string) {
  return id === DEMO_HIRE_ID;
}

export function isDemoListing(id: string) {
  return id === DEMO_HIRE_ID || id === DEMO_INN_ID;
}
