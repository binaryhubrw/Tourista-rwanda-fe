import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Pencil, Store, Package, Star, Leaf } from 'lucide-react';
import type { Business } from '@/types';
import { createBusiness, getLocations, updateBusiness } from '@/services';
import { useAsync, errorMessage } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { PageHeader, StatCard, StatGrid } from '@/components/dashboard';
import { Badge, Button, EmptyState, ErrorState, LoadingSpinner, Rating, SmartImage } from '@/components/ui';
import { BusinessForm } from './BusinessForm';
import { formatRwf } from '@/utils/format';
import { fromPrice, isRoom } from '@/utils/pricing';
import { useOwnerBusinesses } from './useOwnerBusinesses';
import type { BusinessInput } from '@/services/businessService';

export default function MyBusinessPage() {
  useDocumentTitle('My business');
  const { user } = useAuth();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const biz = useOwnerBusinesses();
  const locations = useAsync(getLocations);
  const [editing, setEditing] = useState<Business | 'new' | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (params.get('new')) setEditing('new');
    const editId = params.get('edit');
    if (editId && biz.data) setEditing(biz.data.find((b) => b.id === editId) ?? null);
  }, [params, biz.data]);

  const close = () => { setEditing(null); setParams({}, { replace: true }); };

  const submit = async (input: BusinessInput) => {
    setSaving(true);
    try {
      if (editing === 'new') {
        const created = await createBusiness(input);
        biz.setData((l) => [created, ...(l ?? [])]);
        toast.success(`${created.name} is now listed. Add your services next.`);
      } else if (editing) {
        const updated = await updateBusiness(editing.id, input);
        biz.setData((l) => l?.map((b) => (b.id === updated.id ? updated : b)));
        toast.success('Listing updated.');
      }
      close();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (biz.loading || locations.loading) return <LoadingSpinner />;
  if (biz.error || locations.error) return <ErrorState message={biz.error ?? locations.error ?? undefined} onRetry={() => { biz.reload(); locations.reload(); }} />;

  const list = biz.data ?? [];
  const rated = list.filter((b) => b.rating > 0);

  if (editing) {
    return (
      <>
        <PageHeader title={editing === 'new' ? 'Add your business' : `Edit ${editing.name}`} intro="This is what travellers see on your public listing." />
        <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
          <BusinessForm initial={editing === 'new' ? undefined : editing} locations={locations.data!} ownerId={user!.id} ownerName={user!.name} submitting={saving} onSubmit={submit} onCancel={close} />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Listings" intro="Your public listings on Tourista Rwanda." action={<Button onClick={() => setEditing('new')}><Plus className="h-4 w-4" aria-hidden />Add business</Button>} />
      <StatGrid className="mb-6">
        <StatCard label="Listings" icon={Store} value={list.length} hint={list.map((b) => b.category).filter((c, i, a) => a.indexOf(c) === i).join(', ') || 'No listings yet'} />
        <StatCard label="Services offered" icon={Package} tone="teal" value={list.reduce((s, b) => s + b.services.length, 0)} to="/business-dashboard/services" />
        <StatCard label="Average rating" icon={Star} tone="amber" value={rated.length ? (rated.reduce((s, b) => s + b.rating, 0) / rated.length).toFixed(1) : 'New'} hint={`${list.reduce((s, b) => s + b.reviewCount, 0)} reviews in total`} to="/business-dashboard/reviews" />
        <StatCard label="Sustainability badges" icon={Leaf} tone="violet" value={new Set(list.flatMap((b) => b.badges)).size} hint="Verified by Tourista admins" />
      </StatGrid>
      {!biz.data?.length ? (
        <EmptyState title="No listings yet" message="Add your first business to start receiving bookings." action={<Button onClick={() => setEditing('new')}>Add your business</Button>} />
      ) : (
        <ul className="space-y-4">
          {biz.data.map((b) => (
            <li key={b.id} className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white sm:flex-row">
              <SmartImage src={b.image} alt={b.name} className="aspect-[16/9] w-full sm:aspect-auto sm:w-48" />
              <div className="flex-1 p-5">
                <div className="flex flex-wrap gap-2"><Badge tone="solid">{b.propertyType ?? b.category}</Badge>{b.badges.map((x) => <Badge key={x}>{x}</Badge>)}</div>
                <h2 className="mt-2 font-display text-xl font-bold text-ink">{b.name}</h2>
                <p className="text-sm text-slate-500">{b.district} · {b.services.filter(isRoom).length ? `${b.services.filter(isRoom).reduce((n, r) => n + (r.available ?? 1), 0)} rooms` : `${b.services.length} service${b.services.length === 1 ? '' : 's'}`}{fromPrice(b) && <> · from <span className="font-semibold text-ink">{formatRwf(fromPrice(b)!.priceRwf)}</span> {fromPrice(b)!.unit}</>}</p>
                <Rating value={b.rating} count={b.reviewCount} className="mt-1 text-sm" />
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => setEditing(b)}><Pencil className="h-4 w-4" aria-hidden />Edit listing</Button>
                  <Link to="/business-dashboard/services" className="inline-flex h-9 items-center rounded-full px-4 text-sm font-semibold text-brand-600 hover:bg-brand-50">Rooms & prices</Link>
                  <Link to={`/businesses/${b.id}`} className="inline-flex h-9 items-center rounded-full px-4 text-sm font-semibold text-brand-600 hover:bg-brand-50">View public page</Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
