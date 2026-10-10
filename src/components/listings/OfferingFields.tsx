import { Plus, Trash2 } from 'lucide-react';
import { Button, Input, Select } from '@/components/ui';
import {
  FOOD_CATEGORIES, ROOM_CATEGORIES, WELLNESS_CATEGORIES,
  emptyExtra, type CatalogDraft, type ExtraDraft, type OfferDraft,
} from '@/utils/catalog';

const units = ['per person', 'per night', 'per day', 'per item', 'per group', 'per plate', 'per session'];

interface Props {
  lodging: boolean;
  value: CatalogDraft;
  errors: Record<string, string>;
  onChange: (next: CatalogDraft) => void;
}

function toggle(row: OfferDraft, enabled: boolean): OfferDraft {
  return { ...row, enabled };
}

export function OfferingFields({ lodging, value, errors, onChange }: Props) {
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
      <CatalogBlock
        title="Services"
        intro="Massage, gym, sauna and the other services you offer. Each one needs its own price."
        categories={WELLNESS_CATEGORIES}
        rows={value.wellness}
        errors={errors}
        group="wellness"
        countLabel="Per day"
        onChange={(category, row) => setRow('wellness', category, row)}
      />
      <CatalogBlock
        title="Food and drink"
        intro="Restaurant, bar and coffee shop. Set a price for each one you have."
        categories={FOOD_CATEGORIES}
        rows={value.food}
        errors={errors}
        group="food"
        countLabel="Per day"
        onChange={(category, row) => setRow('food', category, row)}
      />

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
  title, intro, error, categories, rows, errors, group, countLabel, onChange,
}: {
  title: string;
  intro: string;
  error?: string;
  categories: readonly string[];
  rows: Record<string, OfferDraft>;
  errors: Record<string, string>;
  group: string;
  countLabel: string;
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
          return (
            <li key={category} className={`rounded-2xl border p-3 ${row.enabled ? 'border-brand-600 bg-brand-50/50' : 'border-slate-200 bg-white'}`}>
              <label className="flex cursor-pointer items-center gap-3">
                <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={row.enabled} onChange={(e) => onChange(category, toggle(row, e.target.checked))} />
                <span className="font-semibold text-ink">{category}</span>
              </label>
              {row.enabled && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Input label="Price (RWF)" type="number" min={0} required value={row.price} onChange={(e) => onChange(category, { ...row, price: e.target.value })} error={errors[`${key}.price`]} />
                  <Input label={countLabel} type="number" min={1} required={group === 'rooms'} value={row.count} onChange={(e) => onChange(category, { ...row, count: e.target.value })} error={errors[`${key}.count`]} hint={group === 'rooms' ? 'Number of rooms in this category.' : 'How many can be booked in one day. Leave empty if it does not sell out.'} />
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
