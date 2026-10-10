import type { TourismStatistics } from '@/types';
import { USE_MOCK } from './config';
import { api } from './apiClient';
import { delay, read } from './mockDb';
import { statisticsSeed } from '@/data/statistics';

export async function getTourismStatistics(): Promise<TourismStatistics> {
  if (!USE_MOCK) return api.get<TourismStatistics>('/analytics/overview/');
  await delay(500);
  const locations = read('locations');
  return {
    ...statisticsSeed,
    totals: {
      ...statisticsSeed.totals,
      locations: locations.length,
      businesses: read('businesses').length,
      reviews: locations.reduce((s, l) => s + l.reviewCount, 0),
      itineraries: statisticsSeed.totals.itineraries + read('itineraries').length,
      bookings: statisticsSeed.totals.bookings + read('bookings').length,
    },
    popularLocations: [...locations]
      .sort((a, b) => b.visitsLastYear - a.visitsLastYear)
      .slice(0, 8)
      .map((l) => ({ name: l.name.replace(' National Park', ' NP'), visits: l.visitsLastYear })),
  };
}
