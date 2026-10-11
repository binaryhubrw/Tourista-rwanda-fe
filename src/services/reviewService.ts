import type { Review, ReviewTargetType } from '@/types';
import { api } from './apiClient';
import { DEMO_STAFF_REVIEWS } from '@/demo/staffListings';

function mergeReviews(remote: Review[]) {
  const ids = new Set(remote.map((r) => r.id));
  return [...DEMO_STAFF_REVIEWS.filter((r) => !ids.has(r.id)), ...remote];
}

export async function getReviews(filter?: { targetId?: string; userId?: string }): Promise<Review[]> {
  const qs = new URLSearchParams(Object.entries(filter ?? {}).filter(([, v]) => v) as [string, string][]);
  const query = qs.toString();
  let remote: Review[] = [];
  try {
    remote = await api.get<Review[]>(query ? `/reviews/?${query}` : '/reviews/');
  } catch {
    remote = [];
  }
  let list = mergeReviews(remote);
  if (filter?.targetId) list = list.filter((r) => r.targetId === filter.targetId);
  if (filter?.userId) list = list.filter((r) => r.userId === filter.userId);
  return list.sort((a, b) => b.date.localeCompare(a.date));
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
  return api.post<Review>('/reviews/', input);
}

export async function deleteReview(id: string): Promise<void> {
  return api.delete(`/reviews/${id}/`);
}
