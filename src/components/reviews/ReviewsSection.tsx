import { useState } from 'react';
import { PenLine } from 'lucide-react';
import type { ReviewTargetType } from '@/types';
import { getReviews } from '@/services/reviewService';
import { useAsync } from '@/hooks/useAsync';
import { ReviewCard } from '@/components/cards';
import { Button, EmptyState, ErrorState, Loading, Modal, StarRow } from '@/components/ui';
import { ReviewForm } from './ReviewForm';

/** Reviews list + "Write a review" modal for any location, experience or business. */
export function ReviewsSection({ target, id = 'reviews' }: { target: { id: string; type: ReviewTargetType; name: string }; id?: string }) {
  const { data: reviews, loading, error, reload, setData } = useAsync(() => getReviews({ targetId: target.id }), [target.id]);
  const [open, setOpen] = useState(false);
  const avg = reviews?.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id={`${id}-title`} className="font-display text-2xl font-bold text-ink">Reviews</h2>
          {!!reviews?.length && (
            <p className="mt-1 flex items-center gap-2 text-slate-600"><StarRow value={Math.round(avg)} /> {avg.toFixed(1)} from {reviews.length} traveller review{reviews.length > 1 ? 's' : ''} on Tourista</p>
          )}
        </div>
        <Button variant="secondary" onClick={() => setOpen(true)}><PenLine className="h-4 w-4" aria-hidden />Write a review</Button>
      </div>
      {loading ? (
        <Loading variant="section" label="Loading reviews" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !reviews?.length ? (
        <EmptyState title="No reviews yet" message={`Been to ${target.name}? Your review helps the next traveller plan.`} action={<Button onClick={() => setOpen(true)}>Write the first review</Button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {reviews.map((r) => <ReviewCard key={r.id} review={r} />)}
        </div>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title={`Review ${target.name}`}>
        <ReviewForm target={target} onCancel={() => setOpen(false)} onCreated={(r) => { setData((prev) => [r, ...(prev ?? [])]); setOpen(false); }} />
      </Modal>
    </section>
  );
}
