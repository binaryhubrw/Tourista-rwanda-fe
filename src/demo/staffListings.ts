import type { Review } from '@/types';
import { DEMO_HIRE_ID, DEMO_INN_ID } from './vehicles';

export const DEMO_STAFF_REVIEWS: Review[] = [
  { id: 'rev-demo-wheels-1', targetId: DEMO_HIRE_ID, targetType: 'business', targetName: 'Kigali Wheels', userId: 'user-tourist-1', userName: 'Amani Kayitesi', rating: 5, comment: 'The Prado was clean and the manager explained the park roads before we left.', date: '2026-10-04T09:00:00.000Z' },
  { id: 'rev-demo-wheels-2', targetId: DEMO_HIRE_ID, targetType: 'business', targetName: 'Kigali Wheels', userId: 'u-demo-mei', userName: 'Mei Chen', rating: 5, comment: 'Airport pickup in the V-Class was on time. Easy to extend a day from the desk.', date: '2026-09-22T14:20:00.000Z' },
  { id: 'rev-demo-wheels-3', targetId: DEMO_HIRE_ID, targetType: 'business', targetName: 'Kigali Wheels', userId: 'u-demo-james', userName: 'James Okello', rating: 4, comment: 'Corolla was perfect for Kigali. Fuel policy was clear at handover.', date: '2026-09-16T11:10:00.000Z' },
  { id: 'rev-demo-inn-1', targetId: DEMO_INN_ID, targetType: 'business', targetName: 'Kigali Wheels Inn', userId: 'user-tourist-1', userName: 'Amani Kayitesi', rating: 5, comment: 'Stayed the night before the hire. Quiet rooms and breakfast at 6am as promised.', date: '2026-10-05T08:15:00.000Z' },
  { id: 'rev-demo-inn-2', targetId: DEMO_INN_ID, targetType: 'business', targetName: 'Kigali Wheels Inn', userId: 'u-demo-lisa', userName: 'Lisa Berg', rating: 4, comment: 'Clean deluxe room. Parking for the car right outside.', date: '2026-09-29T19:40:00.000Z' },
  { id: 'rev-demo-inn-3', targetId: DEMO_INN_ID, targetType: 'business', targetName: 'Kigali Wheels Inn', userId: 'u-demo-noah', userName: 'Noah Mensah', rating: 5, comment: 'Staff knew our pickup time and had coffee ready before dawn.', date: '2026-08-18T07:05:00.000Z' },
];
