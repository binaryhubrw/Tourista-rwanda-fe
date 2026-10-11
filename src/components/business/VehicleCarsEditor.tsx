import { ImageUpload, Input, Select } from '@/components/ui';
import { VEHICLE_LEVELS, defaultVehicleSeats, offeringBlurb } from '@/utils/catalog';

export interface CarDraft {
  name: string;
  brand: string;
  category: string;
  plate: string;
  image: string;
  seats: string;
  priceRwf: string;
  description: string;
}

export const emptyCar = (level = 'Standard'): CarDraft => ({
  name: '',
  brand: '',
  category: level,
  plate: '',
  image: '',
  seats: String(defaultVehicleSeats(level)),
  priceRwf: '',
  description: offeringBlurb('vehicle', level),
});

export function resizeCars(prev: CarDraft[], raw: string, min = 0) {
  const n = Math.max(min, Math.min(20, Math.round(Number(raw) || min)));
  if (n <= prev.length) return prev.slice(0, n);
  const template = prev[prev.length - 1] ?? emptyCar();
  return [
    ...prev,
    ...Array.from({ length: n - prev.length }, () => ({ ...template, plate: '', image: '' })),
  ];
}

export function patchCar(prev: CarDraft[], index: number, patch: Partial<CarDraft>) {
  return prev.map((car, i) => {
    if (i !== index) return car;
    const next = { ...car, ...patch };
    if (patch.category) {
      if (!car.seats || car.seats === String(defaultVehicleSeats(car.category))) next.seats = String(defaultVehicleSeats(patch.category));
      if (!car.description || car.description === offeringBlurb('vehicle', car.category)) next.description = offeringBlurb('vehicle', patch.category);
    }
    return next;
  });
}

export function VehicleCarsEditor({
  cars,
  errors,
  errorPrefix = 'cars',
  min = 0,
  onChange,
}: {
  cars: CarDraft[];
  errors: Record<string, string>;
  errorPrefix?: string;
  min?: number;
  onChange: (cars: CarDraft[]) => void;
}) {
  return (
    <div>
      <Input
        label="How many cars"
        type="number"
        min={min}
        max={20}
        required={min > 0}
        value={String(cars.length)}
        onChange={(e) => onChange(resizeCars(cars, e.target.value, min))}
        hint="A card opens for each car so you can add its photo, level and plate."
      />
      {cars.length > 0 && (
        <ul className="mt-6 grid gap-6 xl:grid-cols-2">
          {cars.map((car, index) => (
            <li key={index} className="rounded-3xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
              <p className="mb-4 font-display text-lg font-bold text-ink">Car {index + 1} of {cars.length}</p>
              <div className="space-y-4">
                <ImageUpload
                  label="Photo of this car"
                  required
                  max={1}
                  value={car.image ? [car.image] : []}
                  onChange={(photos) => onChange(patchCar(cars, index, { image: photos[0] ?? '' }))}
                  error={errors[`${errorPrefix}.${index}.image`]}
                  hint="A clear photo of this specific car."
                />
                <Input label="Vehicle name" required value={car.name} onChange={(e) => onChange(patchCar(cars, index, { name: e.target.value }))} error={errors[`${errorPrefix}.${index}.name`]} placeholder="e.g. RAV4" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="Brand" required value={car.brand} onChange={(e) => onChange(patchCar(cars, index, { brand: e.target.value }))} error={errors[`${errorPrefix}.${index}.brand`]} placeholder="e.g. Toyota" />
                  <Select label="Level" value={car.category} onChange={(e) => onChange(patchCar(cars, index, { category: e.target.value }))} options={VEHICLE_LEVELS.map((l) => ({ value: l, label: l }))} />
                </div>
                <Input label="Plate number" required value={car.plate} onChange={(e) => onChange(patchCar(cars, index, { plate: e.target.value }))} error={errors[`${errorPrefix}.${index}.plate`] ?? errors[`${errorPrefix}.${index}.plateNumber`]} placeholder="RAD 451 A" hint="This car’s registration plate." />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="Seats / people" type="number" min={1} required value={car.seats} onChange={(e) => onChange(patchCar(cars, index, { seats: e.target.value }))} error={errors[`${errorPrefix}.${index}.seats`]} />
                  <Input label="Price per day (RWF)" type="number" min={0} required value={car.priceRwf} onChange={(e) => onChange(patchCar(cars, index, { priceRwf: e.target.value }))} error={errors[`${errorPrefix}.${index}.priceRwf`] ?? errors[`${errorPrefix}.${index}.price`]} />
                </div>
                <Input label="Short description" value={car.description} onChange={(e) => onChange(patchCar(cars, index, { description: e.target.value }))} error={errors[`${errorPrefix}.${index}.description`]} placeholder="What's included" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
