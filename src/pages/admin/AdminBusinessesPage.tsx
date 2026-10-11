import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Leaf, HeartHandshake, Star, Plus, Upload } from 'lucide-react';
import type { Business, BusinessCategory, PriceLevel, SustainabilityBadge } from '@/types';
import { createBusiness, createBusinesses, getBusinesses, getLocations, getUsers } from '@/services';
import type { BusinessInput } from '@/services/businessService';
import { useAsync, errorMessage } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useQueryFlag } from '@/hooks/useQueryFlag';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Badge, Button, ErrorState, Loading, Modal, Select } from '@/components/ui';
import { BulkImportModal, DataTable, PageHeader, StatCard, StatGrid, type Column, type ImportField } from '@/components/dashboard';
import { BADGE_OPTIONS, BUSINESS_CATEGORIES, BusinessForm, PROPERTY_TYPES } from '../business/BusinessForm';
import { images } from '@/data/images';
import { average } from '@/utils/analytics';
import { formatRwf } from '@/utils/format';
import { fromPrice } from '@/utils/pricing';
import { ListingViewLink } from '../shared/tableColumns';

const columns: Column<Business>[] = [
  { id: 'name', header: 'Business', sortValue: (b) => b.name, cell: (b) => <Link to={`/admin/businesses/${b.id}`} className="font-semibold text-ink hover:text-brand-600 hover:underline">{b.name}</Link> },
  { id: 'owner', header: 'Owner', sortValue: (b) => b.ownerName, cell: (b) => b.ownerName },
  { id: 'category', header: 'Kind', sortValue: (b) => b.listingKind ?? b.propertyType ?? b.category, cell: (b) => <span className="whitespace-nowrap">{b.listingKind ?? b.propertyType ?? b.category}</span> },
  { id: 'district', header: 'District', sortValue: (b) => b.district, cell: (b) => b.district },
  { id: 'from', header: 'From', align: 'right', sortValue: (b) => fromPrice(b)?.priceRwf ?? 0, cell: (b) => { const p = fromPrice(b); return p ? <span className="whitespace-nowrap tabular-nums">{formatRwf(p.priceRwf)} <span className="text-xs text-slate-500">{p.unit}</span></span> : <span className="text-slate-400">No prices</span>; } },
  { id: 'badges', header: 'Badges', exportValue: (b) => b.badges.join('; '), cell: (b) => <div className="flex min-w-[160px] flex-wrap gap-1">{b.badges.map((x) => <Badge key={x}>{x}</Badge>)}</div> },
  { id: 'rating', header: 'Rating', align: 'right', sortValue: (b) => b.rating, cell: (b) => <span className="tabular-nums">{b.rating ? b.rating.toFixed(1) : 'New'}</span> },
];

const PRICE_OPTIONS = ['budget', 'mid-range', 'premium'];

const defaultImage = (c: BusinessCategory) =>
  ({ Accommodation: images.hotel, Restaurants: images.food, 'Tour Guides': images.hills, Handcrafts: images.crafts, 'Local Products': images.coffee, Transportation: images.lake, 'Community Tourism': images.village })[c];

function parsePriceLevel(v: string): PriceLevel | null {
  const k = v.trim().toLowerCase();
  if (!k) return 2;
  if (['1', 'budget', 'low'].includes(k)) return 1;
  if (['2', 'mid', 'midrange', 'mid-range', 'medium'].includes(k)) return 2;
  if (['3', 'premium', 'high', 'luxury'].includes(k)) return 3;
  return null;
}

export default function AdminBusinessesPage() {
  useDocumentTitle('Businesses');
  const { user } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload, setData } = useAsync(async () => {
    const [businesses, locations, users] = await Promise.all([getBusinesses(), getLocations(), getUsers()]);
    return { businesses, locations, owners: users.filter((u) => u.role === 'business_owner') };
  });
  const [category, setCategory] = useState<'all' | BusinessCategory>('all');
  const [adding, setAdding] = useQueryFlag('new');
  const [importing, setImporting] = useQueryFlag('import');
  const [saving, setSaving] = useState(false);

  const all = data?.businesses ?? [];
  const destinations = useMemo(() => {
    const locations = data?.locations ?? [];
    const counts = new Map<string, number>();
    locations.forEach((l) => counts.set(l.name, (counts.get(l.name) ?? 0) + 1));
    return [...locations]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((l) => (counts.get(l.name)! > 1 ? `${l.name} (${l.id})` : l.name));
  }, [data?.locations]);
  const ownerEmails = useMemo(() => [...new Set((data?.owners ?? []).map((o) => o.email))].sort((a, b) => a.localeCompare(b)), [data?.owners]);
  const importFields: ImportField[] = useMemo(() => [
    { key: 'name', label: 'Business name', required: true, example: 'Lake Burera Lodge' },
    { key: 'category', label: 'Category', required: true, example: BUSINESS_CATEGORIES[0], options: [...BUSINESS_CATEGORIES], hint: 'Use the Excel dropdown.' },
    { key: 'propertyType', label: 'Property type', example: PROPERTY_TYPES[0], options: [...PROPERTY_TYPES], hint: 'Accommodation only. Use the Excel dropdown.' },
    { key: 'destination', label: 'Destination', required: true, example: destinations[0] ?? '', options: destinations, hint: destinations.length ? 'Use the Excel dropdown (destinations on the server).' : 'Add locations first, then import businesses.' },
    { key: 'description', label: 'Description', required: true, example: 'Six lakeside rooms with canoe trips and local meals.' },
    { key: 'phone', label: 'Phone', required: true, example: '+250 788 600 100' },
    { key: 'email', label: 'Email', required: true, example: 'stay@burera.rw' },
    { key: 'ownerEmail', label: 'Owner email', example: ownerEmails[0] ?? '', options: ownerEmails, hint: ownerEmails.length ? 'Use the dropdown. Must be a business owner. Leave empty to use your account.' : 'Leave empty to use your account.' },
    { key: 'priceLevel', label: 'Price range', example: 'mid-range', options: PRICE_OPTIONS, hint: 'Use the Excel dropdown.' },
    { key: 'badges', label: 'Badges', example: BADGE_OPTIONS.slice(0, 2).join('; '), options: [...BADGE_OPTIONS], strict: false, hint: 'Use the dropdown, or list several separated by ;' },
    { key: 'photoUrl', label: 'Photo URL', example: '', hint: 'Optional. Add photos later from the branch.' },
  ], [destinations, ownerEmails]);
  const categories = [...new Set(all.map((b) => b.category))].sort();
  const list = useMemo(() => all.filter((b) => category === 'all' || b.category === category), [all, category]);
  const ownerOptions = useMemo(() => [{ id: user!.id, name: `${user!.name} (you)` }, ...(data?.owners ?? []).map((o) => ({ id: o.id, name: o.name }))], [data, user]);

  const add = async (input: BusinessInput) => {
    setSaving(true);
    try {
      const created = await createBusiness({ ...input, ownerName: input.ownerName.replace(/ \(you\)$/, '') });
      setData((d) => d && { ...d, businesses: [created, ...d.businesses] });
      toast.success(`${created.name} is now listed. The owner can add rooms and prices.`);
      setAdding(false);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const parseRow = (r: Record<string, string>) => {
    const errs: string[] = [];
    const cat = BUSINESS_CATEGORIES.find((c) => c.toLowerCase() === (r.category ?? '').trim().toLowerCase());
    const prop = (r.propertyType ?? '').trim() ? PROPERTY_TYPES.find((p) => p.toLowerCase() === r.propertyType.trim().toLowerCase()) : undefined;
    const destKey = (r.destination ?? '').trim().toLowerCase();
    const loc = data?.locations.find((l) => {
      const name = l.name.toLowerCase();
      const id = l.id.toLowerCase();
      return destKey === id || destKey === name || destKey === `${name} (${id})`;
    });
    const ownerEmail = (r.ownerEmail ?? '').trim().toLowerCase();
    const owner = ownerEmail ? data?.owners.find((o) => o.email.toLowerCase() === ownerEmail) : undefined;
    const level = parsePriceLevel(r.priceLevel ?? '');
    const badgeNames = (r.badges ?? '').split(/[;|]/).map((b) => b.trim()).filter(Boolean);
    const badges = badgeNames.map((b) => BADGE_OPTIONS.find((o) => o.toLowerCase() === b.toLowerCase()));

    if ((r.name ?? '').trim().length < 3) errs.push('Name is missing.');
    if (!cat) errs.push(`Unknown category “${r.category ?? ''}”.`);
    if ((r.propertyType ?? '').trim() && !prop) errs.push(`Unknown property type “${r.propertyType}”.`);
    if (!loc) errs.push(`Destination “${r.destination ?? ''}” not found.`);
    if ((r.description ?? '').trim().length < 30) errs.push('Description under 30 characters.');
    if ((r.phone ?? '').replace(/\D/g, '').length < 9) errs.push('Phone is missing or too short.');
    if (!/^\S+@\S+\.\S+$/.test(r.email ?? '')) errs.push('Email is missing or invalid.');
    if (ownerEmail && !owner) errs.push(`No business owner with email ${ownerEmail}.`);
    if (!level) errs.push(`Unknown price range “${r.priceLevel}”.`);
    if (badges.some((b) => !b)) errs.push('Unknown badge.');
    if (r.photoUrl && !/^https?:\/\//.test(r.photoUrl)) errs.push('Photo URL must start with https://');
    if (errs.length || !cat || !loc || !level) return { errors: errs };

    const value: BusinessInput = {
      name: r.name.trim(), category: cat, propertyType: cat === 'Accommodation' ? prop ?? 'Hotel' : undefined,
      locationId: loc.id, district: loc.district.split(/[,&]/)[0].trim(), description: r.description.trim(),
      phone: r.phone.trim(), email: r.email.trim(), image: r.photoUrl || defaultImage(cat), gallery: [],
      priceLevel: level, badges: badges as SustainabilityBadge[],
      ownerId: owner?.id ?? user!.id, ownerName: owner?.name ?? user!.name,
      coordinates: { lat: loc.coordinates.lat + (Math.random() - 0.5) * 0.02, lng: loc.coordinates.lng + (Math.random() - 0.5) * 0.02 },
      services: [],
    };
    return { value, errors: [] };
  };

  const importRows = async (rows: BusinessInput[]) => {
    try {
      const created = await createBusinesses(rows);
      setData((d) => d && { ...d, businesses: [...created, ...d.businesses] });
      toast.success(`${created.length} business${created.length === 1 ? '' : 'es'} imported.`);
    } catch (e) {
      toast.error(errorMessage(e));
      throw e;
    }
  };

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading) return <Loading />;

  const has = (badge: SustainabilityBadge) => all.filter((b) => b.badges.includes(badge)).length;
  const rated = all.filter((b) => b.rating > 0);

  return (
    <>
      <PageHeader
        title="Businesses"
        intro="Registered stays and local businesses, with their prices and sustainability badges."
        action={<>
          <Button variant="secondary" onClick={() => setImporting(true)} disabled={loading}><Upload className="h-4 w-4" aria-hidden />Bulk import</Button>
          <Button onClick={() => setAdding(true)} disabled={loading}><Plus className="h-4 w-4" aria-hidden />Add business</Button>
        </>}
      />

      <StatGrid>
        <StatCard label="Businesses" icon={Building2} value={all.length} hint={`${all.filter((b) => b.category === 'Accommodation').length} places to stay`} />
        <StatCard label="Eco-certified" icon={Leaf} tone="teal" value={has('Eco-certified')} hint={all.length ? `${Math.round((has('Eco-certified') / all.length) * 100)}% of businesses` : undefined} />
        <StatCard label="Women-led" icon={HeartHandshake} tone="violet" value={has('Women-led')} hint={`${has('Community-owned')} community-owned`} />
        <StatCard label="Average rating" icon={Star} tone="amber" value={rated.length ? average(rated.map((b) => b.rating)).toFixed(2) : '—'} />
      </StatGrid>

      <DataTable
        className="mt-6"
        data={list}
        columns={columns}
        getRowId={(b) => b.id}
        initialSort={{ id: 'rating', desc: true }}
        searchText={(b) => `${b.name} ${b.ownerName} ${b.district} ${b.propertyType ?? ''} ${b.badges.join(' ')}`}
        searchPlaceholder="Search businesses"
        filters={
          <div className="w-52">
            <Select aria-label="Filter by category" value={category} onChange={(e) => setCategory(e.target.value as typeof category)} options={[{ value: 'all', label: 'All categories' }, ...categories.map((c) => ({ value: c, label: c }))]} className="h-10 py-0 text-sm" />
          </div>
        }
        exportFileName="businesses"
        emptyTitle="No businesses"
        rowActions={(b) => <ListingViewLink to={`/admin/businesses/${b.id}`} name={b.name} />}
      />

      <Modal open={adding && !!data} onClose={() => setAdding(false)} title="Add a business" size="lg">
        {data && <BusinessForm locations={data.locations} ownerId={user!.id} ownerName={user!.name} owners={ownerOptions} submitting={saving} onSubmit={add} onCancel={() => setAdding(false)} />}
      </Modal>

      <BulkImportModal open={importing && !!data} onClose={() => setImporting(false)} entity="businesses" fields={importFields} parse={parseRow} describe={(r) => r.name ?? ''} onImport={importRows} />
    </>
  );
}
