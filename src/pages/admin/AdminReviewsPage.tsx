import { useMemo, useState } from 'react';
import { MessageSquare, Star, Flag, CalendarDays, Trash2, Plus } from 'lucide-react';
import type { Review, ReviewTargetType } from '@/types';
import { createReview, deleteReview, getBusinesses, getExperiences, getLocations, getReviews } from '@/services';
import { useAsync, errorMessage } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useQueryFlag } from '@/hooks/useQueryFlag';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Button, ConfirmModal, ErrorState, Input, Loading, Modal, RatingInput, Select, Textarea } from '@/components/ui';
import { DataTable, FilterTabs, PageHeader, StatCard, StatGrid } from '@/components/dashboard';
import { reviewColumns, reviewSearchText } from '../shared/tableColumns';
import { average, periodTrend } from '@/utils/analytics';

const columns = reviewColumns(['author', 'target', 'rating', 'comment', 'date']);
type Filter = 'all' | 'low' | 'location' | 'experience' | 'business';

export default function AdminReviewsPage() {
  useDocumentTitle('Reviews');
  const toast = useToast();
  const { user } = useAuth();
  const { data, loading, error, reload, setData } = useAsync(() => getReviews());
  const targets = useAsync(async () => {
    const [locations, experiences, businesses] = await Promise.all([getLocations(), getExperiences(), getBusinesses()]);
    return {
      location: locations.map((l) => ({ id: l.id, name: l.name })),
      experience: experiences.map((e) => ({ id: e.id, name: e.title })),
      business: businesses.map((b) => ({ id: b.id, name: b.name })),
    } as Record<ReviewTargetType, { id: string; name: string }[]>;
  });
  const [adding, setAdding] = useQueryFlag('new');
  const [form, setForm] = useState({ targetType: 'location' as ReviewTargetType, targetId: '', userName: '', rating: 0, comment: '' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [removing, setRemoving] = useState<{ rows: Review[]; done?: () => void } | null>(null);
  const [busy, setBusy] = useState(false);

  const all = data ?? [];
  const isLow = (r: Review) => r.rating <= 2;
  const list = useMemo(() => all.filter((r) => filter === 'all' || (filter === 'low' ? isLow(r) : r.targetType === filter)), [all, filter]);
  const recent = periodTrend(all, (r) => r.date, () => 1, 30);

  const remove = async () => {
    if (!removing) return;
    setBusy(true);
    try {
      await Promise.all(removing.rows.map((r) => deleteReview(r.id)));
      const ids = new Set(removing.rows.map((r) => r.id));
      setData((l) => l?.filter((r) => !ids.has(r.id)));
      toast.success(`${ids.size} review${ids.size > 1 ? 's' : ''} removed.`);
      removing.done?.();
      setRemoving(null);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const options = targets.data?.[form.targetType] ?? [];
  const target = options.find((t) => t.id === form.targetId) ?? options[0];

  const save = async () => {
    const e: Record<string, string> = {};
    if (!target) e.target = 'Choose what is being reviewed.';
    if (form.userName.trim().length < 2) e.userName = 'Enter the reviewer’s name.';
    if (!form.rating) e.rating = 'Choose a rating.';
    if (form.comment.trim().length < 10) e.comment = 'Write at least 10 characters.';
    setFormErrors(e);
    if (Object.keys(e).length || !target) return;
    setSaving(true);
    try {
      const created = await createReview({ targetId: target.id, targetType: form.targetType, targetName: target.name, rating: form.rating as Review['rating'], comment: form.comment.trim(), userId: user!.id, userName: form.userName.trim() });
      setData((l) => [created, ...(l ?? [])]);
      toast.success(`Review of ${target.name} published.`);
      setAdding(false);
      setForm({ targetType: 'location', targetId: '', userName: '', rating: 0, comment: '' });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading) return <Loading />;

  return (
    <>
      <PageHeader title="Reviews" intro="Moderate what travellers publish. Low ratings are worth a closer look." action={<Button onClick={() => { setFormErrors({}); setAdding(true); }}><Plus className="h-4 w-4" aria-hidden />Add review</Button>} />

      <StatGrid>
        <StatCard label="Total reviews" icon={MessageSquare} value={all.length} />
        <StatCard label="Average rating" icon={Star} tone="amber" value={all.length ? average(all.map((r) => r.rating)).toFixed(2) : '—'} hint="Across all places" />
        <StatCard label="Low ratings (1–2★)" icon={Flag} tone="rose" value={all.filter(isLow).length} hint="Check for issues or abuse" />
        <StatCard label="Last 30 days" icon={CalendarDays} tone="teal" value={recent.current} trend={{ value: recent.change, label: 'vs previous 30 days' }} />
      </StatGrid>

      <DataTable
        className="mt-6"
        data={list}
        columns={columns}
        getRowId={(r) => r.id}
        initialSort={{ id: 'date', desc: true }}
        searchText={reviewSearchText}
        searchPlaceholder="Search reviewer, place or text"
        filters={
          <FilterTabs
            label="Filter reviews"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'All', count: all.length },
              { value: 'low', label: 'Low rated', count: all.filter(isLow).length },
              { value: 'location', label: 'Places', count: all.filter((r) => r.targetType === 'location').length },
              { value: 'experience', label: 'Experiences', count: all.filter((r) => r.targetType === 'experience').length },
              { value: 'business', label: 'Businesses', count: all.filter((r) => r.targetType === 'business').length },
            ]}
          />
        }
        exportFileName="reviews"
        bulkActions={(rows, clear) => <Button size="sm" variant="danger" onClick={() => setRemoving({ rows, done: clear })}><Trash2 className="h-4 w-4" aria-hidden />Remove selected</Button>}
        rowActions={(r) => <button onClick={() => setRemoving({ rows: [r] })} className="text-sm font-semibold text-red-600 hover:underline">Remove</button>}
        emptyTitle="No reviews"
      />

      <Modal open={adding} onClose={() => setAdding(false)} title="Add a review" footer={<><Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button><Button onClick={save} loading={saving} disabled={!targets.data}>Publish review</Button></>}>
        <div className="space-y-4">
          <p className="rounded-xl bg-brand-50 px-4 py-3 text-sm text-ink">Use this for feedback collected outside the app, such as guest books or surveys. It is published under the reviewer's name.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Reviewing a" value={form.targetType} onChange={(e) => setForm({ ...form, targetType: e.target.value as ReviewTargetType, targetId: '' })} options={[{ value: 'location', label: 'Destination' }, { value: 'experience', label: 'Experience' }, { value: 'business', label: 'Business' }]} />
            <Select label="Which one" value={target?.id ?? ''} onChange={(e) => setForm({ ...form, targetId: e.target.value })} options={options.map((t) => ({ value: t.id, label: t.name }))} error={formErrors.target} />
          </div>
          <Input label="Reviewer name" required value={form.userName} onChange={(e) => setForm({ ...form, userName: e.target.value })} error={formErrors.userName} placeholder="e.g. Aline M." />
          <RatingInput value={form.rating} onChange={(rating) => setForm({ ...form, rating })} error={formErrors.rating} />
          <Textarea label="Review" required value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} error={formErrors.comment} />
        </div>
      </Modal>

      <ConfirmModal
        open={!!removing}
        title={removing && removing.rows.length > 1 ? `Remove ${removing.rows.length} reviews?` : 'Remove this review?'}
        message="Removed reviews disappear from public pages for everyone."
        confirmLabel="Remove"
        loading={busy}
        onConfirm={remove}
        onCancel={() => setRemoving(null)}
      />
    </>
  );
}
