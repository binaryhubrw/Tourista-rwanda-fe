import { getBookings, getBusinessesByOwner, getReviews } from '@/services';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/context/AuthContext';
import type { Booking, Business, Review } from '@/types';

export function useOwnerBusinesses() {
  const { user } = useAuth();
  return useAsync(() => getBusinessesByOwner(user!.id), [user?.id]);
}

/** The owner's listings plus the bookings and reviews they've received, in one load. */
export function useOwnerActivity() {
  const { user } = useAuth();
  return useAsync<{ businesses: Business[]; bookings: Booking[]; reviews: Review[] }>(async () => {
    const businesses = await getBusinessesByOwner(user!.id);
    const ids = businesses.map((b) => b.id);
    if (!ids.length) return { businesses, bookings: [], reviews: [] };
    const [bookings, reviewLists] = await Promise.all([getBookings({ businessIds: ids }), Promise.all(ids.map((id) => getReviews({ targetId: id })))]);
    return { businesses, bookings, reviews: reviewLists.flat().sort((a, b) => b.date.localeCompare(a.date)) };
  }, [user?.id]);
}
