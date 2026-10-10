import type { Review, ReviewTargetType } from '@/types';
import { USE_MOCK } from './config';
import { api } from './apiClient';
import { delay, read, write } from './mockDb';
import { makeId } from '@/utils/id';

export async function getReviews(filter?: { targetId?: string; userId?: string }): Promise<Review[]> {
  if (!USE_MOCK) {
    const qs = new URLSearchParams(Object.entries(filter ?? {}).filter(([, v]) => v) as [string, string][]);
    return api.get<Review[]>(`/reviews/?${qs}`);
  }
  await delay(250);
  return read('reviews')
    .filter((r) => (!filter?.targetId || r.targetId === filter.targetId) && (!filter?.userId || r.userId === filter.userId))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export interface ReviewInput {
  targetId: string;
  targetType: ReviewTargetType;
  targetName: string;
  rating: Review['rating'];
  comment: string;
  userId: string;
  userName: string;
}

export async function createReview(input: ReviewInput): Promise<Review> {
  if (!USE_MOCK) return api.post<Review>('/reviews/', input);
  await delay();
  if (input.comment.trim().length < 10) throw { message: 'Write at least 10 characters so others can learn from your visit.' };
  const review: Review = { ...input, id: makeId('rev'), date: new Date().toISOString().slice(0, 10) };
  write('reviews', [review, ...read('reviews')]);
  return review;
}

export async function deleteReview(id: string): Promise<void> {
  if (!USE_MOCK) return api.delete(`/reviews/${id}/`);
  await delay();
  write('reviews', read('reviews').filter((r) => r.id !== id));
}
