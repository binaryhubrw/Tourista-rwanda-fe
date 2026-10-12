import type { AppNotification } from '@/types';
import { api } from './apiClient';

export const NOTIFY_EVENT = 'tourista-notify';

export function announceNotifications() {
  window.dispatchEvent(new Event(NOTIFY_EVENT));
}

export async function getNotifications(): Promise<AppNotification[]> {
  return api.get<AppNotification[]>('/notifications/');
}

export async function getUnreadNotificationCount(): Promise<number> {
  const res = await api.get<{ count: number }>('/notifications/unread-count/');
  return res.count;
}

export async function markNotificationRead(id: string): Promise<AppNotification> {
  const next = await api.patch<AppNotification>(`/notifications/${id}/read/`, {});
  announceNotifications();
  return next;
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.post('/notifications/read-all/', {});
  announceNotifications();
}
