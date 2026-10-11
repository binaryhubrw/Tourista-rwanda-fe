import type { Review, ReviewTargetType } from '@/types';
import { api } from './apiClient';

export async function getReviews(filter?: { targetId?: string; userId?: string }): Promise<Review[]> {
  const qs = new URLSearchParams(Object.entries(filter ?? {}).filter(([, v]) => v) as [string, string][]);
  const query = qs.toString();
  return api.get<Review[]>(query ? `/reviews/?${query}` : '/reviews/');
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
