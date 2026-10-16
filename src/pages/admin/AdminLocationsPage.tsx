import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Gem, Star, Footprints, Plus, Upload } from 'lucide-react';
import type { Location, LocationCategory } from '@/types';
import { createLocation, createLocations, getLocations, type LocationInput } from '@/services';
import { useAsync, errorMessage } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useQueryFlag } from '@/hooks/useQueryFlag';
import { useToast } from '@/context/ToastContext';
import { Badge, Button, ErrorState, Input, Modal, Select } from '@/components/ui';
import { BulkImportModal, DataTable, PageHeader, StatCard, StatGrid, type Column, type ImportField } from '@/components/dashboard';
import { average, sum } from '@/utils/analytics';
import { formatCompact } from '@/utils/format';

const DISTRICTS_BY_PROVINCE: Record<string, string[]> = {
  'City of Kigali': ['Gasabo', 'Kicukiro', 'Nyarugenge'],
  'Eastern Province': ['Bugesera', 'Gatsibo', 'Kayonza', 'Kirehe', 'Ngoma', 'Nyagatare', 'Rwamagana'],
  'Northern Province': ['Burera', 'Gakenke', 'Gicumbi', 'Musanze', 'Rulindo'],
  'Southern Province': ['Gisagara', 'Huye', 'Kamonyi', 'Muhanga', 'Nyamagabe', 'Nyanza', 'Nyaruguru', 'Ruhango'],
  'Western Province': ['Karongi', 'Ngororero', 'Nyabihu', 'Nyamasheke', 'Rubavu', 'Rusizi', 'Rutsiro'],
};
const PROVINCES = Object.keys(DISTRICTS_BY_PROVINCE);
// District choices carry their province, so a bulk row can only pick a district that belongs to one.
const DISTRICT_CHOICES = PROVINCES
  .flatMap((p) => DISTRICTS_BY_PROVINCE[p].map((d) => `${d} (${p})`))
  .sort((a, b) => a.localeCompare(b));
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


const blank = { name: '', province: PROVINCES[0], district: DISTRICTS_BY_PROVINCE[PROVINCES[0]][0], lat: '', lng: '' };

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
  const importFields: ImportField[] = useMemo(() => [
    { key: 'name', label: 'Name', required: true, example: 'Kacyiru' },
    { key: 'province', label: 'Province', required: true, example: PROVINCES[0], options: PROVINCES, hint: 'Pick one of Rwanda’s 5 provinces from the dropdown.' },
    { key: 'district', label: 'District', required: true, example: `${DISTRICTS_BY_PROVINCE[PROVINCES[0]][0]} (${PROVINCES[0]})`, options: DISTRICT_CHOICES, hint: 'Pick the district — each option shows its province, and it must be the same province you chose.' },
    { key: 'latitude', label: 'Latitude', required: true, example: '-1.95' },
    { key: 'longitude', label: 'Longitude', required: true, example: '30.06' },
  ], []);
  const categories = [...new Set(all.map((l) => l.category))].sort();
  const list = useMemo(() => all.filter((l) => category === 'all' || l.category === category), [all, category]);
  const names = useMemo(() => new Set(all.map((l) => l.name.toLowerCase())), [all]);

  const save = async () => {
    const e: Record<string, string> = {};
    const lat = Number(form.lat);
    const lng = Number(form.lng);
    if (form.name.trim().length < 2) e.name = 'Enter the name.';
    else if (names.has(form.name.trim().toLowerCase())) e.name = 'A location with this name already exists.';
    if (!DISTRICTS_BY_PROVINCE[form.province]?.includes(form.district)) e.district = 'Choose a district in that province.';
    if (!form.lat || !form.lng || Number.isNaN(lat) || Number.isNaN(lng)) e.coords = 'Enter latitude and longitude as numbers.';
    else if (!inRwanda(lat, lng)) e.coords = 'Those coordinates are outside Rwanda. Latitude is about -1 to -2.8, longitude 28.9 to 30.9.';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      const created = await createLocation({
        name: form.name.trim(), district: form.district.trim(), province: form.province, coordinates: { lat, lng },
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

  const parseRow = (r: Record<string, string>, i: number, rows: Record<string, string>[]) => {
    const errs: string[] = [];
    const name = (r.name ?? '').trim();
    const provinceKey = (r.province ?? '').trim().toLowerCase();
    const province = provinceKey.length >= 4 ? PROVINCES.find((p) => p.toLowerCase() === provinceKey) ?? PROVINCES.find((p) => p.toLowerCase().includes(provinceKey)) : undefined;
    const lat = Number(r.latitude);
    const lng = Number(r.longitude);
    if (name.length < 2) errs.push('Name is missing.');
    else if (names.has(name.toLowerCase())) errs.push('Already exists.');
    else if (rows.findIndex((x) => (x.name ?? '').trim().toLowerCase() === name.toLowerCase()) !== i) errs.push('Repeated in this file.');
    const district = (r.district ?? '').trim().replace(/\s*\([^)]*\)\s*$/, '').trim();
    const districtMatch = province ? DISTRICTS_BY_PROVINCE[province].find((d) => d.toLowerCase() === district.toLowerCase()) : undefined;
    if (district.length < 2) errs.push('District is missing.');
    else if (province && !districtMatch) errs.push(`${district} is not a district in ${province}.`);
    if (!province) errs.push(`Unknown province “${r.province ?? ''}”.`);
    if (!r.latitude || !r.longitude || Number.isNaN(lat) || Number.isNaN(lng)) errs.push('Latitude/longitude missing.');
    else if (!inRwanda(lat, lng)) errs.push('Coordinates are outside Rwanda.');
    if (errs.length || !province) return { errors: errs };
    const value: LocationInput = { name, district: districtMatch ?? district, province, coordinates: { lat, lng } };
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
          <div className="sm:col-span-2"><Input label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} /></div>
          <Select label="Province" required value={form.province} onChange={(e) => { const province = e.target.value; setForm({ ...form, province, district: DISTRICTS_BY_PROVINCE[province][0] }); }} options={PROVINCES.map((p) => ({ value: p, label: p }))} />
          <Select label="District" required value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} error={errors.district} options={(DISTRICTS_BY_PROVINCE[form.province] ?? []).map((d) => ({ value: d, label: d }))} />
          <Input label="Latitude" inputMode="decimal" required placeholder="-1.95" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} error={errors.coords} />
          <Input label="Longitude" inputMode="decimal" required placeholder="30.06" value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} />
        </div>
      </Modal>

      <BulkImportModal open={importing && !!data} onClose={() => setImporting(false)} entity="locations" fields={importFields} parse={parseRow} describe={(r) => r.name ?? ''} onImport={importRows} />
    </>
  );
}
