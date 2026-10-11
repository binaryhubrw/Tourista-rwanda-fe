import { useEffect, useState } from 'react';
import type { User } from '@/types';
import { notificationsFor, unreadNotificationCount } from '@/demo/store';

export function useNotifications(user: User) {
  const [items, setItems] = useState(() => notificationsFor(user));
  useEffect(() => {
    const sync = () => setItems(notificationsFor(user));
    sync();
    window.addEventListener('tourista-demo', sync);
    return () => window.removeEventListener('tourista-demo', sync);
  }, [user.id]);
  return items;
}

export function useUnreadNotificationCount(user: User) {
  const [count, setCount] = useState(() => unreadNotificationCount(user));
  useEffect(() => {
    const sync = () => setCount(unreadNotificationCount(user));
    sync();
    window.addEventListener('tourista-demo', sync);
    return () => window.removeEventListener('tourista-demo', sync);
  }, [user.id]);
  return count;
}
