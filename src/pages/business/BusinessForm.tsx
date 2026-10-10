import { useMemo, useState } from 'react';
import type { Business, Location, PriceLevel, SustainabilityBadge } from '@/types';
import { Button, ImageUpload, Input, LoadingOverlay, Select, Textarea } from '@/components/ui';
import { OfferingFields } from '@/components/listings/OfferingFields';
import type { BusinessInput } from '@/services/businessService';
import {
  LISTING_KINDS, catalogErrors, catalogFromServices, emptyCatalog, isLodgingKind, kindById, listingKindOf, servicesFromCatalog, type CatalogDraft,
} from '@/utils/catalog';

export const BUSINESS_CATEGORIES = [...new Set(LISTING_KINDS.map((kind) => kind.category))];
export const PROPERTY_TYPES = LISTING_KINDS.flatMap((kind) => (kind.propertyType ? [kind.propertyType] : []));
export const BADGE_OPTIONS: SustainabilityBadge[] = ['Eco-certified', 'Community-owned', 'Women-led', 'Plastic-free', 'Solar-powered'];

interface Props {
  initial?: Business;
  locations: Location[];
  ownerId: string;
  ownerName: string;
  /** When given (admin), the listing's owner can be chosen. */
  owners?: { id: string; name: string }[];
  submitting: boolean;
  onSubmit: (input: BusinessInput) => void;
  onCancel: () => void;
  submitLabel?: string;
  cancelLabel?: string;
}

export function BusinessForm({ initial, locations, ownerId, ownerName, owners, submitting, onSubmit, onCancel, submitLabel, cancelLabel }: Props) {
  const [f, setF] = useState({
    name: initial?.name ?? '',
    kind: listingKindOf(initial ?? { category: 'Accommodation', propertyType: 'Hotel' }),
    locationId: initial?.locationId ?? locations[0]?.id ?? '',
    description: initial?.description ?? '',
    phone: initial?.phone ?? '',
    email: initial?.email ?? '',
    photos: initial ? [initial.image, ...(initial.gallery ?? [])].filter(Boolean) : ([] as string[]),
    priceLevel: String(initial?.priceLevel ?? 2),
    badges: initial?.badges ?? ([] as SustainabilityBadge[]),
    ownerId: initial?.ownerId ?? ownerId,
  });
  const [catalog, setCatalog] = useState<CatalogDraft>(() => (initial ? catalogFromServices(initial.services) : emptyCatalog()));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const lodging = isLodgingKind(f.kind);
  const kind = kindById(f.kind);
  const wellnessKind = kind?.id === 'Wellness';
  const prompt = useMemo(() => {
    if (lodging) return { name: 'Listing name', photos: 'Show the outside, the rooms and what guests can book.', extra: 'Rooms come first. Then tick any wellness or food you actually offer.' };
    if (kind?.id === 'Restaurant') return { name: 'Place name', photos: 'Show the dining room and a plated dish.', extra: 'Meals are per plate. Say if you also have self-service, and whether guests can book a table.' };
    if (kind?.id === 'Bar') return { name: 'Place name', photos: 'Show the bar and the terrace.', extra: 'Drink prices vary. Enter a starting price for each kind, then say whether guests can book a table.' };
    if (kind?.id === 'Coffee shop') return { name: 'Place name', photos: 'Show the counter and a seating corner.', extra: 'Cup prices vary. Enter a starting price, then say whether guests can book a table.' };
    if (wellnessKind) return { name: 'Studio or spa name', photos: 'Show the treatment rooms and the space guests walk into.', extra: 'Tick each treatment you offer and give it a price.' };
    if (kind?.id === 'Tour guide') return { name: 'Guide or company name', photos: 'A photo of you, your vehicle or a recent trip.', extra: 'Add the tours you lead as extra services.' };
    if (kind?.id === 'Transportation') return { name: 'Company name', photos: 'Show the vehicles guests will use.', extra: 'Add each transfer or hire as its own service.' };
    return { name: 'Listing name', photos: 'Show what travellers will see when they arrive.', extra: 'Add each thing a guest can book, with a price.' };
  }, [kind?.id, lodging, wellnessKind]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (f.name.trim().length < 3) er.name = 'Enter the listing name.';
    if (!kindById(f.kind)) er.kind = 'Choose the kind of listing.';
    if (f.description.trim().length < 30) er.description = 'Describe what you offer in at least 30 characters.';
    if (f.phone.replace(/\D/g, '').length < 9) er.phone = 'Enter a phone number, e.g. +250 788 000 000.';
    if (!/^\S+@\S+\.\S+$/.test(f.email)) er.email = 'Enter a valid email address.';
    if (!f.photos.length) er.photos = 'Add at least one photo so travellers can see the place.';
    Object.assign(er, catalogErrors(catalog, f.kind));
    setErrors(er);
    if (Object.keys(er).length) return;
    const loc = locations.find((l) => l.id === f.locationId)!;
    const owner = owners?.find((o) => o.id === f.ownerId);
    const kind = kindById(f.kind)!;
    onSubmit({
      name: f.name.trim(), category: kind.category, listingKind: kind.id, locationId: loc.id, district: loc.district.split(/[,&]/)[0].trim(),
      description: f.description.trim(), phone: f.phone.trim(), email: f.email.trim(),
      image: f.photos[0], gallery: f.photos.slice(1),
      propertyType: kind.propertyType,
      priceLevel: Number(f.priceLevel) as PriceLevel, badges: f.badges,
      ownerId: owner?.id ?? ownerId, ownerName: owner?.name ?? ownerName,
      coordinates: initial?.coordinates ?? { lat: loc.coordinates.lat + (Math.random() - 0.5) * 0.02, lng: loc.coordinates.lng + (Math.random() - 0.5) * 0.02 },
      services: servicesFromCatalog(catalog, initial?.services ?? [], f.kind),
    });
  };

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
      <Select label="What are you listing?" required value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })} options={LISTING_KINDS.map((item) => ({ value: item.id, label: item.id }))} error={errors.kind} />
      <Select label="Price range" value={f.priceLevel} onChange={(e) => setF({ ...f, priceLevel: e.target.value })} options={[{ value: '1', label: 'Budget' }, { value: '2', label: 'Mid-range' }, { value: '3', label: 'Premium' }]} />
      <div className="sm:col-span-2"><Input label={prompt.name} required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} error={errors.name} /></div>
      <Select label="Nearest destination" value={f.locationId} onChange={(e) => setF({ ...f, locationId: e.target.value })} options={locations.map((l) => ({ value: l.id, label: l.name }))} />
      {owners && (
        <Select label="Owner" value={f.ownerId} onChange={(e) => setF({ ...f, ownerId: e.target.value })} options={owners.map((o) => ({ value: o.id, label: o.name }))} />
      )}
      <div className="sm:col-span-2"><Textarea label="How should travellers see this listing?" required value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} error={errors.description} placeholder="What you offer, what makes it special and who runs it" /></div>
      <Input label="Phone guests can call" type="tel" required value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} error={errors.phone} />
      <Input label="Email for bookings" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} error={errors.email} />
      <div className="sm:col-span-2">
        <ImageUpload label="Photos" required value={f.photos} onChange={(photos) => setF({ ...f, photos })} error={errors.photos} hint={prompt.photos} />
      </div>
      <p className="sm:col-span-2 rounded-2xl bg-brand-50 px-4 py-3 text-sm text-ink">{prompt.extra}</p>
      <OfferingFields lodging={lodging} kind={f.kind} value={catalog} errors={errors} onChange={setCatalog} />
      <fieldset className="sm:col-span-2">
        <legend className="mb-2 text-sm font-semibold text-ink">Sustainability badges</legend>
        <div className="flex flex-wrap gap-2">
          {BADGE_OPTIONS.map((b) => {
            const on = f.badges.includes(b);
            return (
              <label key={b} className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm font-medium ${on ? 'border-brand-600 bg-brand-50 text-brand-600' : 'border-slate-300 text-slate-700'}`}>
                <input type="checkbox" className="sr-only" checked={on} onChange={() => setF({ ...f, badges: on ? f.badges.filter((x) => x !== b) : [...f.badges, b] })} />
                {b}
              </label>
            );
          })}
        </div>
        <p className="mt-1.5 text-sm text-slate-500">Badges are verified by Tourista admins before they appear publicly.</p>
      </fieldset>
      <div className="flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onCancel}>{cancelLabel ?? 'Cancel'}</Button>
        <Button type="submit" loading={submitting}>{submitLabel ?? (initial ? 'Save changes' : 'Publish listing')}</Button>
      </div>
    </form>
  );
}
