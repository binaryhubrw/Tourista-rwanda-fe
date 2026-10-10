import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Gem, Star, Footprints, Plus, Upload } from 'lucide-react';
import type { Interest, Location, LocationCategory, PriceLevel } from '@/types';
import { createLocation, createLocations, getLocations, type LocationInput } from '@/services';
import { useAsync, errorMessage } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useQueryFlag } from '@/hooks/useQueryFlag';
import { useToast } from '@/context/ToastContext';
import { Badge, Button, ErrorState, ImageUpload, Input, Loading, Modal, Select, Textarea } from '@/components/ui';
import { BulkImportModal, DataTable, PageHeader, StatCard, StatGrid, type Column, type ImportField } from '@/components/dashboard';
import { images } from '@/data/images';
import { average, sum } from '@/utils/analytics';
import { formatCompact } from '@/utils/format';
import { cn } from '@/utils/cn';

const CATEGORIES: LocationCategory[] = ['City', 'National Park', 'Lake', 'Town', 'Cultural Site', 'Hidden Gem'];
const PROVINCES = ['City of Kigali', 'Northern Province', 'Southern Province', 'Eastern Province', 'Western Province'];
const INTERESTS: Interest[] = ['Nature', 'Culture', 'Adventure', 'Food', 'Wildlife', 'History', 'Relaxation'];
// Rwanda's bounding box, to catch swapped or mistyped coordinates.
const inRwanda = (lat: number, lng: number) => lat >= -2.85 && lat <= -1.04 && lng >= 28.85 && lng <= 30.9;

const columns: Column<Location>[] = [
  { id: 'name', header: 'Name', sortValue: (l) => l.name, cell: (l) => <Link to={`/explore?location=${l.id}#explore-listings`} className="font-semibold text-ink hover:text-brand-600 hover:underline">{l.name}</Link> },
  { id: 'district', header: 'District', sortValue: (l) => l.district, cell: (l) => l.district },
  { id: 'province', header: 'Province', sortValue: (l) => l.province, cell: (l) => l.province },
  { id: 'category', header: 'Category', sortValue: (l) => l.category, cell: (l) => <Badge tone={l.isHiddenGem ? 'solid' : 'brand'}>{l.category}</Badge> },
  { id: 'coords', header: 'Coordinates', exportValue: (l) => `${l.coordinates.lat}, ${l.coordinates.lng}`, cell: (l) => <span className="whitespace-nowrap tabular-nums text-slate-500">{l.coordinates.lat.toFixed(3)}, {l.coordinates.lng.toFixed(3)}</span> },
  { id: 'visits', header: 'Visits last year', align: 'right', sortValue: (l) => l.visitsLastYear, cell: (l) => <span className="tabular-nums">{l.visitsLastYear.toLocaleString()}</span> },
  { id: 'rating', header: 'Rating', align: 'right', sortValue: (l) => l.rating, cell: (l) => <span className="tabular-nums">{l.rating ? l.rating.toFixed(1) : 'New'}</span> },
];

const importFields: ImportField[] = [
  { key: 'name', label: 'Name', required: true, example: 'Lake Muhazi' },
  { key: 'category', label: 'Category', required: true, example: 'Lake', hint: CATEGORIES.join(', ') },
  { key: 'district', label: 'District', required: true, example: 'Rwamagana' },
  { key: 'province', label: 'Province', required: true, example: 'Eastern Province', hint: PROVINCES.join(', ') },
  { key: 'latitude', label: 'Latitude', required: true, example: '-1.85' },
  { key: 'longitude', label: 'Longitude', required: true, example: '30.33' },
  { key: 'shortDescription', label: 'Short description', required: true, example: 'A long, quiet lake for weekend escapes from Kigali.' },
  { key: 'description', label: 'Description', example: 'Fishing villages, boat trips and lakeside fish grills.' },
  { key: 'interests', label: 'Interests', example: 'Nature; Relaxation', hint: INTERESTS.join(', ') },
  { key: 'thingsToDo', label: 'Things to do', example: 'Boat trip; Birdwatching' },
  { key: 'photoUrl', label: 'Photo URL', example: '', hint: 'Optional.' },
];

const blank = { name: '', category: 'Hidden Gem' as LocationCategory, district: '', province: PROVINCES[1], lat: '', lng: '', shortDescription: '', description: '', interests: ['Nature'] as Interest[], thingsToDo: '', priceLevel: '1', hiddenGem: true, photos: [] as string[] };

export default function AdminLocationsPage() {
  useDocumentTitle('Locations');
  const toast = useToast();
  const { data, loading, error, reload, setData } = useAsync(getLocations);
  const [category, setCategory] = useState<'all' | LocationCategory>('all');
  const [adding, setAdding] = useQueryFlag('new');
  const [importing, setImporting] = useQueryFlag('import');
  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const all = data ?? [];
  const categories = [...new Set(all.map((l) => l.category))].sort();
  const list = useMemo(() => all.filter((l) => category === 'all' || l.category === category), [all, category]);
  const names = useMemo(() => new Set(all.map((l) => l.name.toLowerCase())), [all]);

  const save = async () => {
    const e: Record<string, string> = {};
    const lat = Number(form.lat);
    const lng = Number(form.lng);
    if (form.name.trim().length < 2) e.name = 'Enter the name.';
    else if (names.has(form.name.trim().toLowerCase())) e.name = 'A location with this name already exists.';
    if (form.district.trim().length < 2) e.district = 'Enter the district.';
    if (!form.lat || !form.lng || Number.isNaN(lat) || Number.isNaN(lng)) e.coords = 'Enter latitude and longitude as numbers.';
    else if (!inRwanda(lat, lng)) e.coords = 'Those coordinates are outside Rwanda. Latitude is about -1 to -2.8, longitude 28.9 to 30.9.';
    if (form.shortDescription.trim().length < 20) e.shortDescription = 'At least 20 characters.';
    if (!form.photos.length) e.photos = 'Add at least one photo.';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      const created = await createLocation({
        name: form.name.trim(), category: form.category, district: form.district.trim(), province: form.province,
        coordinates: { lat, lng }, shortDescription: form.shortDescription.trim(), description: form.description.trim() || form.shortDescription.trim(),
        interests: form.interests, thingsToDo: form.thingsToDo.split(',').map((t) => t.trim()).filter(Boolean), sustainability: [],
        image: form.photos[0], gallery: form.photos.slice(1), priceLevel: Number(form.priceLevel) as PriceLevel, isHiddenGem: form.hiddenGem,
      });
      setData((l) => [created, ...(l ?? [])]);
      toast.success(`${created.name} added. It now appears on the map and in search.`);
      setAdding(false);
      setForm(blank);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const split = (v?: string) => (v ?? '').split(/[;|]/).map((x) => x.trim()).filter(Boolean);
  const parseRow = (r: Record<string, string>, i: number, rows: Record<string, string>[]) => {
    const errs: string[] = [];
    const name = (r.name ?? '').trim();
    const cat = CATEGORIES.find((c) => c.toLowerCase() === (r.category ?? '').trim().toLowerCase());
    const provinceKey = (r.province ?? '').trim().toLowerCase();
    const province = provinceKey.length >= 4 ? PROVINCES.find((p) => p.toLowerCase() === provinceKey) ?? PROVINCES.find((p) => p.toLowerCase().includes(provinceKey)) : undefined;
    const lat = Number(r.latitude);
    const lng = Number(r.longitude);
    const interests = split(r.interests).map((x) => INTERESTS.find((o) => o.toLowerCase() === x.toLowerCase()));
    if (name.length < 2) errs.push('Name is missing.');
    else if (names.has(name.toLowerCase())) errs.push('Already exists.');
    else if (rows.findIndex((x) => (x.name ?? '').trim().toLowerCase() === name.toLowerCase()) !== i) errs.push('Repeated in this file.');
    if (!cat) errs.push(`Unknown category “${r.category ?? ''}”.`);
    if ((r.district ?? '').trim().length < 2) errs.push('District is missing.');
    if (!province) errs.push(`Unknown province “${r.province ?? ''}”.`);
    if (!r.latitude || !r.longitude || Number.isNaN(lat) || Number.isNaN(lng)) errs.push('Latitude/longitude missing.');
    else if (!inRwanda(lat, lng)) errs.push('Coordinates are outside Rwanda.');
    if ((r.shortDescription ?? '').trim().length < 20) errs.push('Short description under 20 characters.');
    if (interests.some((x) => !x)) errs.push('Unknown interest.');
    if (r.photoUrl && !/^https?:\/\//.test(r.photoUrl)) errs.push('Photo URL must start with https://');
    if (errs.length || !cat || !province) return { errors: errs };
    const value: LocationInput = {
      name, category: cat, district: r.district.trim(), province, coordinates: { lat, lng },
      shortDescription: r.shortDescription.trim(), description: (r.description ?? '').trim() || r.shortDescription.trim(),
      interests: (interests.length ? interests : ['Nature']) as Interest[], thingsToDo: split(r.thingsToDo), sustainability: [],
      image: r.photoUrl || images.hills, gallery: [], priceLevel: 1, isHiddenGem: cat === 'Hidden Gem',
    };
    return { value, errors: [] };
  };

  const importRows = async (rows: LocationInput[]) => {
    try {
      const created = await createLocations(rows);
      setData((l) => [...created, ...(l ?? [])]);
      toast.success(`${created.length} location${created.length === 1 ? '' : 's'} imported.`);
    } catch (e) {
      toast.error(errorMessage(e));
      throw e;
    }
  };

  if (error) return <ErrorState message={error} onRetry={reload} />;
  const gems = all.filter((l) => l.isHiddenGem);

  return (
    <>
      <PageHeader
        title="Locations"
        intro="Tourism locations listed on the platform."
        action={<>
          <Button variant="secondary" onClick={() => setImporting(true)}><Upload className="h-4 w-4" aria-hidden />Bulk import</Button>
          <Button onClick={() => { setForm(blank); setErrors({}); setAdding(true); }}><Plus className="h-4 w-4" aria-hidden />Add location</Button>
        </>}
      />

      <StatGrid>
        <StatCard label="Locations" icon={MapPin} loading={loading} value={all.length} hint={`${categories.length} categories`} />
        <StatCard label="Hidden gems" icon={Gem} tone="violet" loading={loading} value={gems.length} hint="Promoted to spread visitors" />
        <StatCard label="Average rating" icon={Star} tone="amber" loading={loading} value={all.some((l) => l.rating) ? average(all.filter((l) => l.rating).map((l) => l.rating)).toFixed(2) : '—'} />
        <StatCard label="Visits last year" icon={Footprints} tone="teal" loading={loading} value={formatCompact(sum(all, (l) => l.visitsLastYear))} />
      </StatGrid>

      <DataTable
        className="mt-6"
        data={list}
        loading={loading}
        columns={columns}
        getRowId={(l) => l.id}
        initialSort={{ id: 'visits', desc: true }}
        searchText={(l) => `${l.name} ${l.district} ${l.province}`}
        searchPlaceholder="Search locations"
        filters={
          <div className="w-52">
            <Select aria-label="Filter by category" value={category} onChange={(e) => setCategory(e.target.value as typeof category)} options={[{ value: 'all', label: 'All categories' }, ...categories.map((c) => ({ value: c, label: c }))]} className="h-10 py-0 text-sm" />
          </div>
        }
        exportFileName="locations"
        emptyTitle="No locations"
      />

      <Modal open={adding && !!data} onClose={() => setAdding(false)} title="Add a location" size="lg" footer={<><Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button><Button onClick={save} loading={saving}>Add location</Button></>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} />
          <Select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as LocationCategory, hiddenGem: e.target.value === 'Hidden Gem' || form.hiddenGem })} options={CATEGORIES.map((c) => ({ value: c, label: c }))} />
          <Input label="District" required value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} error={errors.district} />
          <Select label="Province" value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} options={PROVINCES.map((p) => ({ value: p, label: p }))} />
          <Input label="Latitude" inputMode="decimal" required placeholder="-1.95" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} error={errors.coords} />
          <Input label="Longitude" inputMode="decimal" required placeholder="30.06" value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} />
          <div className="sm:col-span-2"><Input label="Short description" required value={form.shortDescription} onChange={(e) => setForm({ ...form, shortDescription: e.target.value })} error={errors.shortDescription} hint="Shown on cards and in search." /></div>
          <div className="sm:col-span-2"><Textarea label="Full description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <fieldset className="sm:col-span-2">
            <legend className="mb-2 text-sm font-semibold text-ink">Interests</legend>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((i) => {
                const on = form.interests.includes(i);
                return (
                  <label key={i} className={cn('cursor-pointer rounded-full border px-3 py-1.5 text-sm font-medium', on ? 'border-brand-600 bg-brand-50 text-brand-600' : 'border-slate-300 text-slate-700')}>
                    <input type="checkbox" className="sr-only" checked={on} onChange={() => setForm({ ...form, interests: on ? form.interests.filter((x) => x !== i) : [...form.interests, i] })} />{i}
                  </label>
                );
              })}
            </div>
          </fieldset>
          <Input label="Things to do" value={form.thingsToDo} onChange={(e) => setForm({ ...form, thingsToDo: e.target.value })} placeholder="Boat trip, Birdwatching" hint="Separate with commas." />
          <Select label="Cost to visit" value={form.priceLevel} onChange={(e) => setForm({ ...form, priceLevel: e.target.value })} options={[{ value: '1', label: 'Budget' }, { value: '2', label: 'Mid-range' }, { value: '3', label: 'Premium' }]} />
          <label className="flex items-center gap-2 text-sm font-semibold text-ink sm:col-span-2">
            <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={form.hiddenGem} onChange={(e) => setForm({ ...form, hiddenGem: e.target.checked })} />Promote as a hidden gem
          </label>
          <div className="sm:col-span-2"><ImageUpload value={form.photos} onChange={(photos) => setForm({ ...form, photos })} error={errors.photos} required /></div>
        </div>
      </Modal>

      <BulkImportModal open={importing && !!data} onClose={() => setImporting(false)} entity="locations" fields={importFields} parse={parseRow} describe={(r) => r.name ?? ''} onImport={importRows} />
    </>
  );
}
