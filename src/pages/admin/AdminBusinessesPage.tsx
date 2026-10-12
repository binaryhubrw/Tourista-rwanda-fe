import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Leaf, HeartHandshake, Star, Plus, Upload } from 'lucide-react';
import type { Booking, Business, BusinessCategory, PriceLevel, SustainabilityBadge, User } from '@/types';
import { createBusiness, createBusinesses, getBookings, getBusinesses, getLocations, getUsers } from '@/services';
import type { BusinessInput } from '@/services/businessService';
import { useAsync, errorMessage } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useQueryFlag } from '@/hooks/useQueryFlag';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Button, ErrorState, Loading, Modal, Select } from '@/components/ui';
import { BulkImportModal, DataTable, PageHeader, StatCard, StatGrid, type Column, type ImportField } from '@/components/dashboard';
import { BADGE_OPTIONS, BUSINESS_CATEGORIES, BusinessForm, PROPERTY_TYPES } from '../business/BusinessForm';
import { images } from '@/data/images';
import { average } from '@/utils/analytics';
import { formatRwf } from '@/utils/format';
import { listingKindOf, fleetCount } from '@/utils/catalog';
import { bookingsForListing, subscriptionsPaid } from '@/utils/lifecycle';
import { ListingViewLink } from '../shared/tableColumns';

interface CompanyRow {
  id: string;
  href: string;
  name: string;
  ownerName: string;
  kinds: string;
  districts: string;
  categories: BusinessCategory[];
  branchCount: number;
  vehicleCount: number;
  bookingCount: number;
  subscriptionRwf: number;
  rating: number;
  search: string;
}

function companyRows(listings: Business[], owners: User[], bookings: Booking[]): CompanyRow[] {
  const ownerById = new Map(owners.map((owner) => [owner.id, owner]));
  const groups = new Map<string, Business[]>();
  listings.forEach((listing) => {
    const key = listing.ownerId || `listing:${listing.id}`;
    const group = groups.get(key) ?? [];
    group.push(listing);
    groups.set(key, group);
  });
  return [...groups.entries()].map(([key, branches]) => {
    const owner = branches[0].ownerId ? ownerById.get(branches[0].ownerId) : undefined;
    const name = owner?.businessName?.trim() || owner?.name || branches[0].ownerName || branches[0].name;
    const kinds = [...new Set(branches.map((branch) => listingKindOf(branch)))].join(', ');
    const districts = [...new Set(branches.map((branch) => branch.district))].join(', ');
    const mine = branches.flatMap((branch) => bookingsForListing(bookings, branch.id));
    const rated = branches.filter((branch) => branch.rating > 0);
    return {
      id: key,
      href: `/admin/businesses/${branches[0].id}`,
      name,
      ownerName: owner?.name || branches[0].ownerName,
      kinds,
      districts,
      categories: [...new Set(branches.map((branch) => branch.category))],
      branchCount: branches.length,
      vehicleCount: branches.reduce((sum, branch) => sum + fleetCount(branch.services), 0),
      bookingCount: mine.length,
      subscriptionRwf: subscriptionsPaid(mine),
      rating: rated.length ? average(rated.map((branch) => branch.rating)) : 0,
      search: `${name} ${owner?.name ?? ''} ${branches.map((branch) => `${branch.name} ${branch.district} ${listingKindOf(branch)}`).join(' ')}`,
    };
  });
}

const columns: Column<CompanyRow>[] = [
  { id: 'name', header: 'Business', sortValue: (row) => row.name, cell: (row) => <Link to={row.href} className="font-semibold text-ink hover:text-brand-600 hover:underline">{row.name}</Link> },
  { id: 'owner', header: 'Owner', sortValue: (row) => row.ownerName, cell: (row) => row.ownerName },
  { id: 'kind', header: 'Kind', sortValue: (row) => row.kinds, cell: (row) => <span className="whitespace-nowrap">{row.kinds}</span> },
  { id: 'districts', header: 'Districts', sortValue: (row) => row.districts, cell: (row) => row.districts },
  { id: 'branches', header: 'Branches', align: 'right', sortValue: (row) => row.branchCount, cell: (row) => <span className="tabular-nums">{row.branchCount}</span> },
  { id: 'vehicles', header: 'Vehicles', align: 'right', sortValue: (row) => row.vehicleCount, cell: (row) => <span className="tabular-nums">{row.vehicleCount}</span> },
  { id: 'bookings', header: 'Bookings', align: 'right', sortValue: (row) => row.bookingCount, cell: (row) => <span className="tabular-nums">{row.bookingCount}</span> },
  { id: 'fees', header: 'Subscriptions paid', align: 'right', sortValue: (row) => row.subscriptionRwf, cell: (row) => <span className="whitespace-nowrap tabular-nums">{formatRwf(row.subscriptionRwf)}</span> },
  { id: 'rating', header: 'Rating', align: 'right', sortValue: (row) => row.rating, cell: (row) => <span className="tabular-nums">{row.rating ? row.rating.toFixed(1) : 'New'}</span> },
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
    const [businesses, locations, users, bookings] = await Promise.all([getBusinesses(), getLocations(), getUsers(), getBookings()]);
    return { businesses, locations, owners: users.filter((u) => u.role === 'business_owner'), bookings };
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
  const companies = useMemo(() => companyRows(all, data?.owners ?? [], data?.bookings ?? []), [all, data?.owners, data?.bookings]);
  const categories = [...new Set(all.map((b) => b.category))].sort();
  const list = useMemo(() => companies.filter((row) => category === 'all' || row.categories.includes(category)), [companies, category]);
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
  const rated = companies.filter((row) => row.rating > 0);

  return (
    <>
      <PageHeader
        title="Businesses"
        intro="Each row is one company. Open it to see branches, vehicles, bookings, and fees."
        action={<>
          <Button variant="secondary" onClick={() => setImporting(true)} disabled={loading}><Upload className="h-4 w-4" aria-hidden />Bulk import</Button>
          <Button onClick={() => setAdding(true)} disabled={loading}><Plus className="h-4 w-4" aria-hidden />Add business</Button>
        </>}
      />

      <StatGrid>
        <StatCard label="Businesses" icon={Building2} value={companies.length} hint={`${all.length} branch${all.length === 1 ? '' : 'es'}`} />
        <StatCard label="Eco-certified" icon={Leaf} tone="teal" value={has('Eco-certified')} hint={companies.length ? `${Math.round((has('Eco-certified') / Math.max(all.length, 1)) * 100)}% of branches` : undefined} />
        <StatCard label="Women-led" icon={HeartHandshake} tone="violet" value={has('Women-led')} hint={`${has('Community-owned')} community-owned`} />
        <StatCard label="Average rating" icon={Star} tone="amber" value={rated.length ? average(rated.map((row) => row.rating)).toFixed(2) : '—'} />
      </StatGrid>

      <DataTable
        className="mt-6"
        data={list}
        columns={columns}
        getRowId={(b) => b.id}
        initialSort={{ id: 'rating', desc: true }}
        searchText={(row) => row.search}
        searchPlaceholder="Search businesses"
        filters={
          <div className="w-52">
            <Select aria-label="Filter by category" value={category} onChange={(e) => setCategory(e.target.value as typeof category)} options={[{ value: 'all', label: 'All categories' }, ...categories.map((c) => ({ value: c, label: c }))]} className="h-10 py-0 text-sm" />
          </div>
        }
        exportFileName="businesses"
        emptyTitle="No businesses"
        rowActions={(row) => <ListingViewLink to={row.href} name={row.name} />}
      />

      <Modal open={adding && !!data} onClose={() => setAdding(false)} title="Add a business" size="lg">
        {data && <BusinessForm locations={data.locations} ownerId={user!.id} ownerName={user!.name} owners={ownerOptions} submitting={saving} onSubmit={add} onCancel={() => setAdding(false)} />}
      </Modal>

      <BulkImportModal open={importing && !!data} onClose={() => setImporting(false)} entity="businesses" fields={importFields} parse={parseRow} describe={(r) => r.name ?? ''} onImport={importRows} />
    </>
  );
}
