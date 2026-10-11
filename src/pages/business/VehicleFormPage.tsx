import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import type { Service } from '@/types';
import { saveVehicle } from '@/demo/store';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useToast } from '@/context/ToastContext';
import { Button, ButtonLink, ErrorState, Loading, Select } from '@/components/ui';
import { PageHeader } from '@/components/dashboard';
import { VehicleCarsEditor, emptyCar, type CarDraft } from '@/components/business/VehicleCarsEditor';
import { makeId } from '@/utils/id';
import { defaultVehicleSeats, parsePlateList, vehicleLevelPhoto, vehicleUnits } from '@/utils/catalog';
import { useOwnerBusinesses } from './useOwnerBusinesses';

function groupKey(car: CarDraft) {
  return [car.name.trim().toLowerCase(), car.brand.trim().toLowerCase(), car.category, car.priceRwf, car.seats].join('|');
}

function toService(id: string, cars: CarDraft[]): Service {
  const first = cars[0];
  const plates = cars.map((car) => parsePlateList(car.plate)[0]).filter(Boolean);
  return {
    id,
    name: first.name.trim(),
    brand: first.brand.trim(),
    category: first.category,
    description: first.description.trim(),
    priceRwf: Math.round(Number(first.priceRwf)),
    unit: 'per day',
    group: 'vehicle',
    available: cars.length,
    capacity: Math.round(Number(first.seats) || defaultVehicleSeats(first.category)),
    image: first.image,
    plateNumber: plates[0],
    plates,
    units: cars.map((car) => ({
      plate: parsePlateList(car.plate)[0],
      image: car.image,
      level: car.category,
    })),
  };
}

export default function VehicleFormPage() {
  const { businessId = '', serviceId = '' } = useParams();
  const [params] = useSearchParams();
  const creating = !serviceId;
  const navigate = useNavigate();
  const toast = useToast();
  const biz = useOwnerBusinesses();
  const listings = biz.data ?? [];
  const listing = listings.find((item) => item.id === (businessId || params.get('listing') || listings[0]?.id));
  const vehicle = listing?.services.find((s) => s.id === serviceId && s.group === 'vehicle');
  const fromListing = params.get('from') === 'listing';

  const [listingId, setListingId] = useState(businessId || params.get('listing') || '');
  const [cars, setCars] = useState<CarDraft[]>([emptyCar()]);
  const [hydrated, setHydrated] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useDocumentTitle(creating ? 'Add vehicles' : vehicle ? `Edit ${vehicle.name}` : 'Edit vehicle');

  useEffect(() => {
    if (!biz.data || hydrated) return;
    const chosen = listings.find((item) => item.id === (businessId || params.get('listing') || listings[0]?.id));
    setListingId(chosen?.id ?? '');
    if (vehicle) {
      setCars(vehicleUnits(vehicle).map((unit) => ({
        name: vehicle.name,
        brand: vehicle.brand ?? '',
        category: unit.level || vehicle.category || 'Standard',
        plate: unit.plate,
        image: unit.image || vehicle.image || vehicleLevelPhoto(vehicle.category),
        seats: String(vehicle.capacity ?? defaultVehicleSeats(vehicle.category ?? '')),
        priceRwf: String(vehicle.priceRwf),
        description: vehicle.description,
      })));
    }
    setHydrated(true);
  }, [biz.data, businessId, hydrated, listings, params, vehicle]);

  const selectedListing = listings.find((item) => item.id === listingId) ?? listing;
  const backTo = fromListing && (listingId || selectedListing?.id)
    ? `/business-dashboard/business/${listingId || selectedListing?.id}`
    : '/business-dashboard/vehicles';
  const takenPlates = useMemo(() => {
    const skip = new Set(creating ? [] : [serviceId]);
    return new Set(
      (selectedListing?.services ?? [])
        .filter((s) => s.group === 'vehicle' && !skip.has(s.id))
        .flatMap((s) => vehicleUnits(s).map((u) => u.plate.toUpperCase())),
    );
  }, [selectedListing, creating, serviceId]);

  const save = () => {
    const er: Record<string, string> = {};
    if (!listingId) er.listing = 'Choose a branch.';
    const seen = new Set<string>();
    cars.forEach((car, i) => {
      if (car.name.trim().length < 3) er[`cars.${i}.name`] = 'Enter a vehicle name.';
      if (car.brand.trim().length < 2) er[`cars.${i}.brand`] = 'Enter the brand.';
      if (!(Number(car.priceRwf) > 0)) er[`cars.${i}.priceRwf`] = 'Enter a price in RWF.';
      if (!(Number(car.seats) >= 1)) er[`cars.${i}.seats`] = 'Enter how many people this car carries.';
      if (!car.image) er[`cars.${i}.image`] = 'Add a photo of this car.';
      const plate = parsePlateList(car.plate)[0];
      if (!plate) er[`cars.${i}.plate`] = 'Enter this car’s plate number.';
      else if (seen.has(plate) || takenPlates.has(plate)) er[`cars.${i}.plate`] = 'That plate is already used.';
      if (plate) seen.add(plate);
    });
    setErrors(er);
    if (Object.keys(er).length || !selectedListing) return;

    const groups = new Map<string, CarDraft[]>();
    cars.forEach((car) => {
      const key = groupKey(car);
      groups.set(key, [...(groups.get(key) ?? []), car]);
    });
    const entries = [...groups.values()];
    setSaving(true);
    entries.forEach((group, index) => {
      const id = !creating && index === 0 ? serviceId : makeId('veh');
      saveVehicle(selectedListing.id, toService(id, group));
    });
    toast.success(creating ? (cars.length > 1 ? `${cars.length} cars added.` : 'Vehicle added.') : 'Vehicle updated.');
    navigate(backTo);
  };

  if (biz.loading || !hydrated) return <Loading />;
  if (biz.error) return <ErrorState message={biz.error} onRetry={biz.reload} />;
  if (!listings.length) {
    return (
      <>
        <PageHeader title="Add vehicles" />
        <div className="mt-6"><ErrorState message="Add a branch first. Vehicles belong to a branch." onRetry={() => navigate('/business-dashboard/business/new')} /></div>
      </>
    );
  }
  if (!creating && !vehicle) return <ErrorState message="That vehicle was not found." onRetry={() => navigate(backTo)} />;

  return (
    <>
      <ButtonLink to={backTo} variant="ghost" className="mb-3 -ml-2 w-fit"><ChevronLeft className="h-4 w-4" aria-hidden />{fromListing ? 'Back to branch' : 'Back to vehicles'}</ButtonLink>
      <PageHeader
        title={creating ? 'Add vehicles' : `Edit ${vehicle?.brand ? `${vehicle.brand} · ` : ''}${vehicle?.name ?? 'vehicle'}`}
        intro="Set how many cars you are adding, then fill in each one: photo, level, plate, seats and daily price."
      />

      <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-7">
        {listings.length > 1 && !fromListing && (
          <div className="mb-6 max-w-md">
            <Select
              label="Branch"
              value={listingId}
              onChange={(e) => setListingId(e.target.value)}
              error={errors.listing}
              options={listings.map((b) => ({ value: b.id, label: b.name }))}
            />
          </div>
        )}
        <VehicleCarsEditor cars={cars} errors={errors} min={1} onChange={setCars} />

        <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => navigate(backTo)}>Cancel</Button>
          <Button onClick={save} loading={saving}>{creating ? 'Add vehicles' : 'Save changes'}</Button>
        </div>
      </div>
    </>
  );
}
