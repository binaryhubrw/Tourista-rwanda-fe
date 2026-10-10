import { Link } from 'react-router-dom';
import type { Review } from '@/types';
import { Avatar, StarRow } from '@/components/ui';
import { formatDate } from '@/utils/format';

const hrefFor = (r: Review) =>
  r.targetType === 'location' ? `/explore?location=${r.targetId}#explore-listings` : r.targetType === 'experience' ? `/experiences/${r.targetId}` : `/businesses/${r.targetId}`;

export function ReviewCard({ review, showTarget, action }: { review: Review; showTarget?: boolean; action?: React.ReactNode }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5">
      <header className="flex items-center gap-3">
        <Avatar name={review.userName} src={review.userAvatar} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">{review.userName}</p>
          <p className="text-sm text-slate-500"><time dateTime={review.date}>{formatDate(review.date)}</time></p>
        </div>
        <StarRow value={review.rating} />
      </header>
      {showTarget && (
        <p className="mt-3 text-sm">
          <span className="text-slate-500">Reviewed </span>
          <Link to={hrefFor(review)} className="font-semibold text-brand-600 hover:underline">{review.targetName}</Link>
        </p>
      )}
      <p className="mt-3 text-[15px] leading-relaxed text-slate-700">{review.comment}</p>
      {action && <div className="mt-3">{action}</div>}
    </article>
  );
}
