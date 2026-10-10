import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { Review, ReviewTargetType } from '@/types';
import { Button, RatingInput, Textarea, buttonClass } from '@/components/ui';
import { createReview } from '@/services/reviewService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { errorMessage } from '@/hooks/useAsync';

interface Props {
  target: { id: string; type: ReviewTargetType; name: string };
  onCreated: (review: Review) => void;
  onCancel?: () => void;
}

export function ReviewForm({ target, onCreated, onCancel }: Props) {
  const { user } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [errors, setErrors] = useState<{ rating?: string; comment?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  if (!user) {
    return (
      <div className="rounded-2xl bg-brand-50 p-5 text-center">
        <p className="font-medium text-ink">Log in to share your experience of {target.name}.</p>
        <Link to="/login" state={{ from: location.pathname }} className={buttonClass('primary', 'sm', 'mt-3')}>Log in to write a review</Link>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!rating) next.rating = 'Choose a rating from 1 to 5 stars.';
    if (comment.trim().length < 10) next.comment = 'Write at least 10 characters about your visit.';
    setErrors(next);
    if (Object.keys(next).length) return;
    setSubmitting(true);
    try {
      const review = await createReview({
        targetId: target.id, targetType: target.type, targetName: target.name,
        rating: rating as Review['rating'], comment: comment.trim(), userId: user.id, userName: user.name,
      });
      toast.success('Review published. Thank you for helping other travellers.');
      setRating(0);
      setComment('');
      onCreated(review);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <RatingInput value={rating} onChange={setRating} error={errors.rating} />
      <Textarea
        label="Your review"
        required
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        error={errors.comment}
        placeholder={`What should other travellers know about ${target.name}?`}
        maxLength={1000}
        hint={`${comment.length}/1000`}
      />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel && <Button variant="ghost" onClick={onCancel}>Cancel</Button>}
        <Button type="submit" loading={submitting}>Publish review</Button>
      </div>
    </form>
  );
}
