import { useState } from 'react';
import { MessageSquare, Star, MapPin, CalendarDays, Trash2 } from 'lucide-react';
import type { Review } from '@/types';
import { deleteReview, getReviews } from '@/services';
import { useAsync, errorMessage } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Button, ButtonLink, ConfirmModal, ErrorState } from '@/components/ui';
import { DataTable, PageHeader, StatCard, StatGrid } from '@/components/dashboard';
import { reviewColumns, reviewSearchText } from '../shared/tableColumns';
import { average } from '@/utils/analytics';
import { formatDate } from '@/utils/format';

const columns = reviewColumns(['target', 'rating', 'comment', 'date']);

export default function MyReviewsPage() {
  useDocumentTitle('My reviews');
  const { user } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload, setData } = useAsync(() => getReviews({ userId: user!.id }), [user?.id]);
  const [removing, setRemoving] = useState<{ rows: Review[]; done?: () => void } | null>(null);
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    if (!removing) return;
    setBusy(true);
    try {
      await Promise.all(removing.rows.map((r) => deleteReview(r.id)));
      const ids = new Set(removing.rows.map((r) => r.id));
      setData((l) => l?.filter((r) => !ids.has(r.id)));
      toast.success(ids.size > 1 ? `${ids.size} reviews deleted.` : 'Review deleted.');
      removing.done?.();
      setRemoving(null);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (error) return <ErrorState message={error} onRetry={reload} />;
  const list = data ?? [];

  return (
    <>
      <PageHeader title="My reviews" intro="Reviews help other travellers and reward great local hosts." />

      <StatGrid>
        <StatCard label="Reviews written" icon={MessageSquare} loading={loading} value={list.length} />
        <StatCard label="Average rating given" icon={Star} tone="amber" loading={loading} value={list.length ? average(list.map((r) => r.rating)).toFixed(1) : '—'} hint="Out of 5 stars" />
        <StatCard label="Places reviewed" icon={MapPin} tone="teal" loading={loading} value={new Set(list.map((r) => r.targetId)).size} />
        <StatCard label="Latest review" icon={CalendarDays} tone="violet" loading={loading} value={list[0] ? formatDate(list[0].date, { day: 'numeric', month: 'short' }) : '—'} hint={list[0]?.targetName} />
      </StatGrid>

      <DataTable
        className="mt-6"
        data={list}
        loading={loading}
        columns={columns}
        getRowId={(r) => r.id}
        initialSort={{ id: 'date', desc: true }}
        searchText={reviewSearchText}
        searchPlaceholder="Search your reviews"
        exportFileName="my-reviews"
        bulkActions={(rows, clear) => <Button size="sm" variant="danger" onClick={() => setRemoving({ rows, done: clear })}><Trash2 className="h-4 w-4" aria-hidden />Delete selected</Button>}
        rowActions={(r) => <button onClick={() => setRemoving({ rows: [r] })} className="text-sm font-semibold text-red-600 hover:underline">Delete</button>}
        emptyTitle="You haven't written any reviews yet"
        emptyMessage="Open any destination, experience or business you've visited and select Write a review."
        emptyAction={<ButtonLink to="/explore" variant="secondary" size="sm">Find a listing to review</ButtonLink>}
      />

      <ConfirmModal
        open={!!removing}
        title={removing && removing.rows.length > 1 ? `Delete ${removing.rows.length} reviews?` : 'Delete this review?'}
        message={removing && removing.rows.length > 1 ? 'These reviews will be removed for everyone.' : `Your review of ${removing?.rows[0]?.targetName} will be removed for everyone.`}
        confirmLabel="Delete"
        loading={busy}
        onConfirm={remove}
        onCancel={() => setRemoving(null)}
      />
    </>
  );
}
