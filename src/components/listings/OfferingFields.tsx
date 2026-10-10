import { Plus, Trash2 } from 'lucide-react';
import { Button, Input, Select } from '@/components/ui';
import {
  DRINK_CATEGORIES, FOOD_CATEGORIES, ROOM_CATEGORIES, WELLNESS_CATEGORIES,
  emptyExtra, type BookingMode, type CatalogDraft, type ExtraDraft, type OfferDraft, type ServiceStyle, type VenueDraft,
} from '@/utils/catalog';

const units = ['per person', 'per night', 'per day', 'per item', 'per group', 'per plate', 'per drink', 'per cup', 'per session'];

interface Props {
  lodging: boolean;
  kind?: string;
  value: CatalogDraft;
  errors: Record<string, string>;
  onChange: (next: CatalogDraft) => void;
}

function toggle(row: OfferDraft, enabled: boolean): OfferDraft {
  return { ...row, enabled };
}

export function OfferingFields({ lodging, kind, value, errors, onChange }: Props) {
  const setRow = (group: 'rooms' | 'wellness' | 'food', category: string, row: OfferDraft) => {
    onChange({ ...value, [group]: { ...value[group], [category]: row } });
  };
  const setExtra = (index: number, extra: ExtraDraft) => {
    const extras = value.extras.map((item, i) => (i === index ? extra : item));
    onChange({ ...value, extras });
  };

  return (
    <div className="space-y-6 sm:col-span-2">
      {lodging && (
        <CatalogBlock
          title="Rooms"
          intro="Tick each room category you offer. Set the nightly price and how many rooms you have in that category."
          error={errors.rooms}
          categories={ROOM_CATEGORIES}
          rows={value.rooms}
          errors={errors}
          group="rooms"
          countLabel="Rooms"
          onChange={(category, row) => setRow('rooms', category, row)}
        />
      )}
      {(lodging || kind === 'Wellness') && (
        <CatalogBlock
          title={kind === 'Wellness' ? 'Treatments' : 'Wellness services'}
          intro={kind === 'Wellness' ? 'Tick each treatment this place offers and give it a price.' : 'Massage, gym, sauna and the other services you offer. Each one needs its own price.'}
          categories={WELLNESS_CATEGORIES}
          rows={value.wellness}
          errors={errors}
          group="wellness"
          countLabel="Per day"
          onChange={(category, row) => setRow('wellness', category, row)}
        />
      )}
      {lodging && (
        <CatalogBlock
          title="Food and drink"
          intro="Restaurant meals are per plate. Bar and coffee prices are a starting price — the bill depends on what the guest orders."
          categories={FOOD_CATEGORIES}
          rows={value.food}
          errors={errors}
          group="food"
          labels={{
            Restaurant: { price: 'Typical plate (RWF)', count: 'Covers', hint: 'Charged per plate. How many guests you can seat.' },
            Bar: { price: 'Drinks from (RWF)', count: 'Seats', hint: 'Starting price per drink. Prices vary by what is ordered.' },
            'Coffee shop': { price: 'Coffee from (RWF)', count: 'Seats', hint: 'Starting price per cup. Speciality drinks can cost more.' },
          }}
          onChange={(category, row) => setRow('food', category, row)}
        />
      )}
      {(kind === 'Restaurant' || kind === 'Bar' || kind === 'Coffee shop') && (
        <VenueFields kind={kind} value={value.venue} errors={errors} onChange={(venue) => onChange({ ...value, venue })} />
      )}

      <fieldset className="rounded-2xl border border-slate-200 p-4">
        <legend className="px-1 font-display text-lg font-bold text-ink">Other things guests can book</legend>
        <p className="mb-3 text-sm text-slate-600">Tours, workshops, products or anything else with its own price and description.</p>
        <div className="space-y-3">
          {value.extras.map((extra, index) => (
            <div key={extra.id} className="grid gap-3 rounded-2xl border border-brand-100 bg-brand-50/40 p-3 sm:grid-cols-2">
              <Input label="Name" value={extra.name} onChange={(e) => setExtra(index, { ...extra, name: e.target.value })} error={errors[`extras.${index}.name`]} placeholder="City day tour" />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Price (RWF)" type="number" min={0} value={extra.price} onChange={(e) => setExtra(index, { ...extra, price: e.target.value })} error={errors[`extras.${index}.price`]} />
                <Select label="Charged" value={extra.unit} onChange={(e) => setExtra(index, { ...extra, unit: e.target.value })} options={units.map((unit) => ({ value: unit, label: unit }))} />
              </div>
              <div className="sm:col-span-2"><Input label="Description" value={extra.description} onChange={(e) => setExtra(index, { ...extra, description: e.target.value })} error={errors[`extras.${index}.description`]} placeholder="What is included" /></div>
              <div className="flex items-end justify-between gap-3 sm:col-span-2">
                <Input label="How many per day" type="number" min={1} value={extra.count} onChange={(e) => setExtra(index, { ...extra, count: e.target.value })} hint="Leave empty if it does not sell out." className="max-w-[200px]" />
                <button type="button" onClick={() => onChange({ ...value, extras: value.extras.filter((_, i) => i !== index) })} className="mb-1 inline-flex items-center gap-1 text-sm font-semibold text-red-600 hover:underline">
                  <Trash2 className="h-4 w-4" aria-hidden />Remove
                </button>
              </div>
            </div>
          ))}
        </div>
        <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={() => onChange({ ...value, extras: [...value.extras, emptyExtra()] })}>
          <Plus className="h-4 w-4" aria-hidden />Add a service
        </Button>
      </fieldset>
      {errors.catalog && <p className="text-sm text-red-600">{errors.catalog}</p>}
    </div>
  );
}

function CatalogBlock({
  title, intro, error, categories, rows, errors, group, countLabel, labels, onChange,
}: {
  title: string;
  intro: string;
  error?: string;
  categories: readonly string[];
  rows: Record<string, OfferDraft>;
  errors: Record<string, string>;
  group: string;
  countLabel?: string;
  labels?: Record<string, { price: string; count: string; hint: string }>;
  onChange: (category: string, row: OfferDraft) => void;
}) {
  return (
    <fieldset className="rounded-2xl border border-slate-200 p-4">
      <legend className="px-1 font-display text-lg font-bold text-ink">{title}</legend>
      <p className="mb-3 text-sm text-slate-600">{intro}</p>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <ul className="space-y-2">
        {categories.map((category) => {
          const row = rows[category];
          const key = `${group}.${category}`;
          const meta = labels?.[category];
          return (
            <li key={category} className={`rounded-2xl border p-3 ${row.enabled ? 'border-brand-600 bg-brand-50/50' : 'border-slate-200 bg-white'}`}>
              <label className="flex cursor-pointer items-center gap-3">
                <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={row.enabled} onChange={(e) => onChange(category, toggle(row, e.target.checked))} />
                <span className="font-semibold text-ink">{category}</span>
              </label>
              {row.enabled && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Input label={meta?.price ?? 'Price (RWF)'} type="number" min={0} required value={row.price} onChange={(e) => onChange(category, { ...row, price: e.target.value })} error={errors[`${key}.price`]} />
                  <Input label={meta?.count ?? countLabel ?? 'How many'} type="number" min={1} required={group === 'rooms'} value={row.count} onChange={(e) => onChange(category, { ...row, count: e.target.value })} error={errors[`${key}.count`]} hint={meta?.hint ?? (group === 'rooms' ? 'Number of rooms in this category. Each room has one bed.' : 'How many can be booked in one day. Leave empty if it does not sell out.')} />
                  <div className="sm:col-span-2">
                    <Input label="Description" required value={row.description} onChange={(e) => onChange(category, { ...row, description: e.target.value })} error={errors[`${key}.description`]} />
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}

const styles: { id: ServiceStyle; title: string; text: string }[] = [
  { id: 'table', title: 'Table service', text: 'Guests order from a menu. Charged per plate.' },
  { id: 'self', title: 'Self-service', text: 'Buffet or counter. Charged per person.' },
  { id: 'both', title: 'Both', text: 'Plated meals and a self-service option.' },
];

const bookingModes: { id: BookingMode; title: string; text: string }[] = [
  { id: 'book', title: 'Book ahead', text: 'Guests reserve a table on Tourista.' },
  { id: 'walk-in', title: 'Walk-in only', text: 'No table booking. Guests come and order.' },
  { id: 'both', title: 'Book or walk in', text: 'They can reserve, or just arrive.' },
];

function VenueFields({ kind, value, errors, onChange }: { kind: string; value: VenueDraft; errors: Record<string, string>; onChange: (next: VenueDraft) => void }) {
  const set = (patch: Partial<VenueDraft>) => onChange({ ...value, ...patch });
  const needsSeats = value.bookable !== 'walk-in';
  const restaurant = kind === 'Restaurant';
  const bar = kind === 'Bar';
  const coffee = kind === 'Coffee shop';

  return (
    <fieldset className="rounded-2xl border border-slate-200 p-4">
      <legend className="px-1 font-display text-lg font-bold text-ink">{restaurant ? 'How guests eat' : bar ? 'Drinks' : 'Coffee and snacks'}</legend>
      <p className="mb-3 text-sm text-slate-600">
        {restaurant && 'Meals are per plate, not per day. Add self-service if you also run a buffet or counter.'}
        {bar && 'Drink prices vary. Enter a starting price for each kind you serve. Guests pay for what they order.'}
        {coffee && 'Prices vary by drink. Enter a starting price for a cup, and for a snack if you sell food.'}
      </p>

      {restaurant && (
        <>
          <p className="mb-2 text-sm font-semibold text-ink">Service style</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {styles.map((item) => (
              <label key={item.id} className={`cursor-pointer rounded-2xl border p-3 ${value.style === item.id ? 'border-brand-600 bg-brand-50/50' : 'border-slate-200'}`}>
                <input type="radio" className="sr-only" name="service-style" checked={value.style === item.id} onChange={() => set({ style: item.id })} />
                <span className="block font-semibold text-ink">{item.title}</span>
                <span className="mt-1 block text-xs text-slate-600">{item.text}</span>
              </label>
            ))}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {(value.style === 'table' || value.style === 'both') && (
              <Input label="Typical plate (RWF)" type="number" min={0} required value={value.platePrice} onChange={(e) => set({ platePrice: e.target.value })} error={errors.platePrice} hint="Charged per plate." />
            )}
            {(value.style === 'self' || value.style === 'both') && (
              <Input label="Self-service (RWF)" type="number" min={0} required value={value.buffetPrice} onChange={(e) => set({ buffetPrice: e.target.value })} error={errors.buffetPrice} hint="Buffet or counter, per person." />
            )}
          </div>
        </>
      )}

      {bar && (
        <>
          {errors.drinks && <p className="mb-3 text-sm text-red-600">{errors.drinks}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            {DRINK_CATEGORIES.map((drink) => (
              <Input key={drink} label={`${drink} from (RWF)`} type="number" min={0} value={value.drinks[drink]} onChange={(e) => set({ drinks: { ...value.drinks, [drink]: e.target.value } })} hint="Starting price per drink." />
            ))}
          </div>
        </>
      )}

      {coffee && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Coffee from (RWF)" type="number" min={0} value={value.coffeeFrom} onChange={(e) => set({ coffeeFrom: e.target.value })} error={errors.coffeeFrom} hint="Starting price per cup." />
          <Input label="Snack from (RWF)" type="number" min={0} value={value.snackFrom} onChange={(e) => set({ snackFrom: e.target.value })} hint="Starting price per item. Leave empty if you do not sell food." />
        </div>
      )}

      <p className="mb-2 mt-5 text-sm font-semibold text-ink">Can guests book a table?</p>
      <div className="grid gap-2 sm:grid-cols-3">
        {bookingModes.map((item) => (
          <label key={item.id} className={`cursor-pointer rounded-2xl border p-3 ${value.bookable === item.id ? 'border-brand-600 bg-brand-50/50' : 'border-slate-200'}`}>
            <input type="radio" className="sr-only" name="booking-mode" checked={value.bookable === item.id} onChange={() => set({ bookable: item.id })} />
            <span className="block font-semibold text-ink">{item.title}</span>
            <span className="mt-1 block text-xs text-slate-600">{item.text}</span>
          </label>
        ))}
      </div>
      {needsSeats && (
        <div className="mt-4 max-w-xs">
          <Input label="Seats guests can book" type="number" min={1} required value={value.seats} onChange={(e) => set({ seats: e.target.value })} error={errors.seats} hint="How many people you can seat if they reserve." />
        </div>
      )}
    </fieldset>
  );
}
