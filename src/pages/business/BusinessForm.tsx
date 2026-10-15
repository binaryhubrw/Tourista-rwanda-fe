import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { Business, Location, PriceLevel, SustainabilityBadge } from '@/types';
import { Button, ImageUpload, Input, Select, Textarea } from '@/components/ui';
import { fieldClass } from '@/components/ui/Input';
import { cn } from '@/utils/cn';
import { OfferingFields } from '@/components/listings/OfferingFields';
import type { BusinessInput } from '@/services/businessService';
import { errorMessage } from '@/hooks/useAsync';
import {
  LISTING_KINDS, catalogErrors, catalogFromServices, emptyCatalog, isLodgingKind, kindById, listingKindOf, servicesFromCatalog, type CatalogDraft,
} from '@/utils/catalog';

export const BUSINESS_CATEGORIES = [...new Set(LISTING_KINDS.map((kind) => kind.category))];
export const PROPERTY_TYPES = LISTING_KINDS.flatMap((kind) => (kind.propertyType ? [kind.propertyType] : []));
export const BADGE_OPTIONS: SustainabilityBadge[] = ['Eco-certified', 'Community-owned', 'Women-led', 'Plastic-free', 'Solar-powered'];

const draftKey = (ownerId: string) => `tourista.branch-draft.${ownerId}`;

function readDraft(ownerId: string): { f: Record<string, unknown>; catalog: CatalogDraft } | null {
  try {
    const raw = sessionStorage.getItem(draftKey(ownerId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.f || typeof parsed.f.name !== 'string' || !Array.isArray(parsed.f.photos)) return null;
    if (!parsed.catalog?.rooms || !parsed.catalog?.vehicles || !Array.isArray(parsed.catalog.extras)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeDraft(ownerId: string, f: unknown, catalog: CatalogDraft) {
  try { sessionStorage.setItem(draftKey(ownerId), JSON.stringify({ f, catalog })); } catch { /* a full browser store must not block the submit */ }
}

function clearDraft(ownerId: string) {
  try { sessionStorage.removeItem(draftKey(ownerId)); } catch { /* ignore */ }
}

function showFormAlert() {
  window.setTimeout(() => document.getElementById('branch-form-alert')?.scrollIntoView({ block: 'nearest' }), 40);
}

function locationLabel(location: Location) {
  return location.name === location.district ? location.name : `${location.name} · ${location.district}`;
}

function LocationField({ locations, value, onChange }: { locations: Location[]; value: string; onChange: (id: string) => void }) {
  const fieldId = useId();
  const listId = useId();
  const root = useRef<HTMLDivElement>(null);
  const selected = locations.find((location) => location.id === value);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const needle = query.trim().toLowerCase();
  const matches = useMemo(() => {
    const rows = locations
      .map((location) => ({ id: location.id, label: locationLabel(location), hay: `${location.name} ${location.district} ${location.province}`.toLowerCase() }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return needle ? rows.filter((row) => row.hay.includes(needle)) : rows;
  }, [locations, needle]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div ref={root} className="relative">
      <label htmlFor={fieldId} className="mb-1.5 block text-sm font-semibold text-ink">Location</label>
      <input
        id={fieldId}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        placeholder="Search by name or district"
        className={fieldClass}
        value={open ? query : (selected ? locationLabel(selected) : '')}
        onFocus={() => { setOpen(true); setQuery(''); }}
        onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
      />
      {open && (
        <ul id={listId} role="listbox" className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {matches.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-500">No locations match.</li>
          ) : matches.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                role="option"
                aria-selected={row.id === value}
                className={cn('w-full px-3 py-2 text-left text-sm', row.id === value ? 'bg-brand-50 font-semibold text-brand-700' : 'text-ink hover:bg-slate-50')}
                onMouseDown={(event) => { event.preventDefault(); onChange(row.id); setQuery(''); setOpen(false); }}
              >
                {row.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface Props {
  initial?: Business;
  locations: Location[];
  ownerId: string;
  ownerName: string;
  /** When given (admin), the branch's owner can be chosen. */
  owners?: { id: string; name: string }[];
  submitting: boolean;
  onSubmit: (input: BusinessInput) => void | Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
  cancelLabel?: string;
}

export function BusinessForm({ initial, locations, ownerId, ownerName, owners, submitting, onSubmit, onCancel, submitLabel, cancelLabel }: Props) {
  const [f, setF] = useState(() => {
    const saved = !initial ? readDraft(ownerId) : null;
    if (saved?.f) return saved.f as {
      name: string; kind: string; locationId: string; description: string; phone: string; email: string;
      photos: string[]; priceLevel: string; badges: SustainabilityBadge[]; ownerId: string;
    };
    return {
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
    };
  });
  const [catalog, setCatalog] = useState<CatalogDraft>(() => (!initial && readDraft(ownerId)?.catalog) || (initial ? catalogFromServices(initial.services) : emptyCatalog()));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const lodging = isLodgingKind(f.kind);
  const kind = kindById(f.kind);
  const wellnessKind = kind?.id === 'Wellness';
  const prompt = useMemo(() => {
    if (lodging) return { name: 'Branch name', photos: 'Show the outside, the rooms and what guests can book.', extra: 'Rooms come first. You can also add hire cars the same way as on Add vehicle, then wellness or food you actually offer.' };
    if (kind?.id === 'Restaurant') return { name: 'Place name', photos: 'Show the dining room and a plated dish.', extra: 'Meals are per plate. Say if you also have self-service, and whether guests can book a table.' };
    if (kind?.id === 'Bar') return { name: 'Place name', photos: 'Show the bar and the terrace.', extra: 'Drink prices vary. Enter a starting price for each kind, then say whether guests can book a table.' };
    if (kind?.id === 'Coffee shop') return { name: 'Place name', photos: 'Show the counter and a seating corner.', extra: 'Cup prices vary. Enter a starting price, then say whether guests can book a table.' };
    if (wellnessKind) return { name: 'Studio or spa name', photos: 'Show the treatment rooms and the space guests walk into.', extra: 'Tick each treatment you offer and give it a price.' };
    if (kind?.id === 'Tour guide') return { name: 'Guide or company name', photos: 'A photo of you, your vehicle or a recent trip.', extra: 'Add the tours you lead as extra services.' };
    if (kind?.id === 'Transportation') return { name: 'Company name', photos: 'Show the vehicles guests will use.', extra: 'Set how many cars you have, then add each one’s photo, level, plate and daily price.' };
    return { name: 'Branch name', photos: 'Show what travellers will see when they arrive.', extra: 'Add each thing a guest can book, with a price.' };
  }, [kind?.id, lodging, wellnessKind]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!initial) writeDraft(ownerId, f, catalog);
    const er: Record<string, string> = {};
    if (f.name.trim().length < 3) er.name = 'Enter the branch name.';
    if (!kindById(f.kind)) er.kind = 'Choose the kind of branch.';
    if (f.description.trim().length < 30) er.description = 'Describe what you offer in at least 30 characters.';
    if (f.phone.replace(/\D/g, '').length < 9) er.phone = 'Enter a phone number, e.g. +250 788 000 000.';
    if (!/^\S+@\S+\.\S+$/.test(f.email)) er.email = 'Enter a valid email address.';
    if (!f.photos?.length) er.photos = 'Add at least one photo so travellers can see the place.';
    Object.assign(er, catalogErrors(catalog, f.kind));
    const messages = [...new Set(Object.values(er))];
    if (messages.length) {
      setErrors({ ...er, form: messages.join(' ') });
      showFormAlert();
      return;
    }
    const loc = locations.find((l) => l.id === f.locationId);
    const baseLat = Number(loc?.coordinates?.lat);
    const baseLng = Number(loc?.coordinates?.lng);
    const chosen = kindById(f.kind);
    if (!loc || !Number.isFinite(baseLat) || !Number.isFinite(baseLng) || !chosen) {
      setErrors({ form: 'Choose a location, then submit again. What you typed is still here.' });
      showFormAlert();
      return;
    }
    const owner = owners?.find((o) => o.id === f.ownerId);
    const jitter = (Math.random() - 0.5) * 0.02;
    let payload: BusinessInput;
    try {
      payload = {
        name: f.name.trim(), category: chosen.category, listingKind: chosen.id, locationId: loc.id, district: String(loc.district ?? '').split(/[,&]/)[0].trim(),
        description: f.description.trim(), phone: f.phone.trim(), email: f.email.trim(),
        image: f.photos[0], gallery: f.photos.slice(1),
        propertyType: chosen.propertyType,
        priceLevel: Number(f.priceLevel) as PriceLevel, badges: f.badges,
        ownerId: owner?.id ?? ownerId, ownerName: owner?.name ?? ownerName,
        coordinates: initial?.coordinates ?? {
          lat: Math.min(-1, Math.max(-3, baseLat + jitter)),
          lng: Math.min(31, Math.max(28.8, baseLng + jitter)),
        },
        services: servicesFromCatalog(catalog, initial?.services ?? [], f.kind),
      };
    } catch (err) {
      setErrors({ form: errorMessage(err) });
      showFormAlert();
      return;
    }
    Promise.resolve(onSubmit(payload)).then(() => { if (!initial) clearDraft(ownerId); }).catch((err) => {
      setErrors({ form: errorMessage(err) });
      showFormAlert();
    });
  };

  return (
    <form onSubmit={submit} onChange={() => { if (!initial) writeDraft(ownerId, f, catalog); }} className="grid gap-4 sm:grid-cols-2" noValidate>
      <Select label="What kind of branch?" required value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })} options={LISTING_KINDS.map((item) => ({ value: item.id, label: item.id }))} error={errors.kind} />
      <Select label="Price range" value={f.priceLevel} onChange={(e) => setF({ ...f, priceLevel: e.target.value })} options={[{ value: '1', label: 'Budget' }, { value: '2', label: 'Mid-range' }, { value: '3', label: 'Premium' }]} />
      <div className="sm:col-span-2"><Input label={prompt.name} required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} error={errors.name} /></div>
      <LocationField locations={locations} value={f.locationId} onChange={(locationId) => setF({ ...f, locationId })} />
      {owners && (
        <Select label="Owner" value={f.ownerId} onChange={(e) => setF({ ...f, ownerId: e.target.value })} options={owners.map((o) => ({ value: o.id, label: o.name }))} />
      )}
      <div className="sm:col-span-2"><Textarea label="How should travellers see this branch?" required value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} error={errors.description} placeholder="What you offer, what makes it special and who runs it" /></div>
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
      {errors.form && <p id="branch-form-alert" role="alert" className="sm:col-span-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{errors.form}</p>}
      <div className="flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onCancel}>{cancelLabel ?? 'Cancel'}</Button>
        <Button type="submit" loading={submitting}>{submitLabel ?? (initial ? 'Save changes' : 'Publish branch')}</Button>
      </div>
    </form>
  );
}
