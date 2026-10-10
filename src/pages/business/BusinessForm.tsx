import { useState } from 'react';
import type { Business, Location, PriceLevel, SustainabilityBadge } from '@/types';
import { Button, ImageUpload, Input, Select, Textarea } from '@/components/ui';
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
}

export function BusinessForm({ initial, locations, ownerId, ownerName, owners, submitting, onSubmit, onCancel }: Props) {
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

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (f.name.trim().length < 3) er.name = 'Enter the business name.';
    if (!kindById(f.kind)) er.kind = 'Choose the kind of listing.';
    if (f.description.trim().length < 30) er.description = 'Describe what you offer in at least 30 characters.';
    if (f.phone.replace(/\D/g, '').length < 9) er.phone = 'Enter a phone number, e.g. +250 788 000 000.';
    if (!/^\S+@\S+\.\S+$/.test(f.email)) er.email = 'Enter a valid email address.';
    if (!f.photos.length) er.photos = 'Add at least one photo so travellers can see the place.';
    Object.assign(er, catalogErrors(catalog, lodging));
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
      services: servicesFromCatalog(catalog, initial?.services ?? [], lodging),
    });
  };

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
      <div className="sm:col-span-2"><Input label="Business name" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} error={errors.name} /></div>
      <Select label="Kind of listing" required value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })} options={LISTING_KINDS.map((kind) => ({ value: kind.id, label: kind.id }))} error={errors.kind} />
      <Select label="Price range" value={f.priceLevel} onChange={(e) => setF({ ...f, priceLevel: e.target.value })} options={[{ value: '1', label: 'Budget' }, { value: '2', label: 'Mid-range' }, { value: '3', label: 'Premium' }]} />
      <Select label="Nearest destination" value={f.locationId} onChange={(e) => setF({ ...f, locationId: e.target.value })} options={locations.map((l) => ({ value: l.id, label: l.name }))} />
      {owners && (
        <Select label="Owner" value={f.ownerId} onChange={(e) => setF({ ...f, ownerId: e.target.value })} options={owners.map((o) => ({ value: o.id, label: o.name }))} />
      )}
      <div className="sm:col-span-2"><Textarea label="Description" required value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} error={errors.description} placeholder="What you offer, what makes it special and who runs it" /></div>
      <Input label="Phone" type="tel" required value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} error={errors.phone} />
      <Input label="Email" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} error={errors.email} />
      <div className="sm:col-span-2">
        <ImageUpload label="Photos" required value={f.photos} onChange={(photos) => setF({ ...f, photos })} error={errors.photos} hint="Show the outside, the rooms and what guests can book." />
      </div>
      <OfferingFields lodging={lodging} value={catalog} errors={errors} onChange={setCatalog} />
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
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={submitting}>{initial ? 'Save changes' : 'Publish listing'}</Button>
      </div>
    </form>
  );
}
