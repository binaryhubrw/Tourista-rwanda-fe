import { useEffect } from 'react';
import type { User } from '@/types';
import { NOTIFY_EVENT, getNotifications, getUnreadNotificationCount } from '@/services';
import { useAsync } from './useAsync';

export function useNotifications(user: User) {
  const list = useAsync(getNotifications, [user.id]);

  useEffect(() => {
    const sync = () => list.reload();
    window.addEventListener(NOTIFY_EVENT, sync);
    return () => window.removeEventListener(NOTIFY_EVENT, sync);
  }, [list.reload]);

  return { items: list.data ?? [], reload: list.reload, loading: list.loading, error: list.error };
}

export function useUnreadNotificationCount(user: User) {
  const count = useAsync(getUnreadNotificationCount, [user.id]);

  useEffect(() => {
    const sync = () => count.reload();
    window.addEventListener(NOTIFY_EVENT, sync);
    const timer = window.setInterval(sync, 30_000);
    return () => {
      window.removeEventListener(NOTIFY_EVENT, sync);
      window.clearInterval(timer);
    };
  }, [count.reload]);

  return count.data ?? 0;
}
