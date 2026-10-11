import { Badge, SmartImage } from '@/components/ui';
import { cn } from '@/utils/cn';
import { formatRwf } from '@/utils/format';
import { VEHICLE_LEVELS, vehicleCarry, vehicleLevelPhoto, vehicleUnits } from '@/utils/catalog';
import type { Service } from '@/types';

export function VehicleCategoryGallery({ fleet, highlight }: { fleet: Service[]; highlight?: string }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {VEHICLE_LEVELS.map((level) => {
        const vehicles = fleet.filter((s) => (s.category ?? 'Standard') === level);
        const cars = vehicles.reduce((n, s) => n + (s.available ?? vehicleUnits(s).length ?? 1), 0);
        const from = vehicles.length ? Math.min(...vehicles.map((s) => s.priceRwf)) : 0;
        const sample = vehicles[0];
        const seats = sample ? vehicleCarry(sample).peopleLabel : `${({ Economy: 4, Standard: 5, VIP: 7, VVIP: 22, Luxury: 7 }[level] ?? 4)} people`;
        return (
          <li key={level} className={cn('overflow-hidden rounded-2xl border bg-white', highlight === level ? 'border-brand-600 ring-2 ring-brand-600/30' : 'border-slate-200')}>
            <SmartImage src={vehicleLevelPhoto(level)} alt={`${level} hire car`} className="aspect-[16/10] w-full" />
            <div className="p-3">
              <p className="font-display font-bold text-ink">{level}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {cars ? `${cars} ${cars === 1 ? 'car' : 'cars'} · ${seats}` : `Typical look · ${seats}`}
                {from ? ` · from ${formatRwf(from)}` : ''}
              </p>
              {highlight === level && <p className="mt-1 text-xs font-semibold text-brand-600">This car’s level</p>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Every physical car in the fleet, grouped by hire level, with its photo and plate. */
export function VehicleUnitGallery({ fleet, highlight }: { fleet: Service[]; highlight?: string }) {
  const levels = VEHICLE_LEVELS.filter((level) => fleet.some((s) => (s.category ?? 'Standard') === level) || level === highlight);
  return (
    <div className="space-y-8">
      {levels.map((level) => {
        const vehicles = fleet.filter((s) => (s.category ?? 'Standard') === level);
        const cars = vehicles.flatMap((service) => vehicleUnits(service).map((unit) => ({ service, unit })));
        return (
          <section key={level}>
            <div className="mb-3 flex flex-wrap items-baseline gap-2">
              <h3 className="font-display text-lg font-bold text-ink">{level}</h3>
              <p className="text-sm text-slate-500">{cars.length ? `${cars.length} ${cars.length === 1 ? 'car' : 'cars'}` : 'No cars in this level yet'}</p>
            </div>
            {cars.length ? (
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {cars.map(({ service, unit }) => {
                  const current = highlight && ((unit.level ?? service.category) === highlight) && (highlight === service.category);
                  return (
                    <li key={`${service.id}-${unit.plate}`} className={cn('overflow-hidden rounded-2xl border bg-white', current ? 'border-brand-600 ring-2 ring-brand-600/30' : 'border-slate-200')}>
                      <SmartImage src={unit.image || vehicleLevelPhoto(level)} alt={`${service.brand ? `${service.brand} ` : ''}${service.name} ${unit.plate}`} className="aspect-[16/10] w-full" />
                      <div className="p-3">
                        <p className="font-display font-bold tracking-wide text-ink">{unit.plate}</p>
                        <p className="mt-0.5 text-sm text-slate-600">{service.brand ? `${service.brand} · ` : ''}{service.name}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <Badge tone="solid">{level}</Badge>
                          <Badge>{vehicleCarry(service).peopleLabel}</Badge>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">Add cars on this level from the add-vehicle page.</p>
            )}
          </section>
        );
      })}
    </div>
  );
}
