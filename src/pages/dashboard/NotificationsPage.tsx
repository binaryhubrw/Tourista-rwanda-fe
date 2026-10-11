import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CalendarCheck, CheckCheck, MessageSquare, RotateCcw, Users, Wallet } from 'lucide-react';
import type { AppNotification, NotificationKind } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useNotifications } from '@/hooks/useNotifications';
import { markAllNotificationsRead, markNotificationRead } from '@/demo/store';
import { Badge, Button, EmptyState } from '@/components/ui';
import { FilterTabs, PageHeader, StatCard, StatGrid } from '@/components/dashboard';
import { cn } from '@/utils/cn';
import { formatWhen } from '@/utils/format';

type View = 'all' | 'unread' | 'read';

const kindMeta: Record<NotificationKind, { label: string; icon: typeof Bell; tone: 'brand' | 'success' | 'warning' | 'violet' | 'neutral' }> = {
  booking: { label: 'Booking', icon: CalendarCheck, tone: 'brand' },
  payment: { label: 'Payment', icon: Wallet, tone: 'success' },
  refund: { label: 'Refund', icon: RotateCcw, tone: 'warning' },
  review: { label: 'Review', icon: MessageSquare, tone: 'violet' },
  staff: { label: 'Team', icon: Users, tone: 'brand' },
  system: { label: 'Account', icon: Bell, tone: 'neutral' },
};

export default function NotificationsPage() {
  useDocumentTitle('Notifications');
  const { user } = useAuth();
  const items = useNotifications(user!);
  const [view, setView] = useState<View>('all');
  const unread = items.filter((n) => !n.readAt).length;
  const visible = view === 'unread' ? items.filter((n) => !n.readAt) : view === 'read' ? items.filter((n) => n.readAt) : items;

  return (
    <>
      <PageHeader
        title="Notifications"
        intro="Updates on bookings, payments, refunds and reviews."
        action={unread ? <Button variant="secondary" size="sm" onClick={() => markAllNotificationsRead(user!.id)}><CheckCheck className="h-4 w-4" aria-hidden />Mark all read</Button> : undefined}
      />
      <StatGrid columns={3} className="mb-6">
        <StatCard label="All" icon={Bell} value={items.length} />
        <StatCard label="Unread" icon={Bell} tone="amber" value={unread} />
        <StatCard label="Read" icon={CheckCheck} tone="teal" value={items.length - unread} />
      </StatGrid>
      <FilterTabs
        label="Notification filters"
        value={view}
        onChange={setView}
        options={[
          { value: 'all', label: 'All', count: items.length },
          { value: 'unread', label: 'Unread', count: unread },
          { value: 'read', label: 'Read', count: items.length - unread },
        ]}
      />
      <div className="mt-4">
        {!visible.length ? (
          <EmptyState
            title={view === 'unread' ? 'You are up to date' : view === 'read' ? 'Nothing read yet' : 'No notifications yet'}
            message={view === 'unread' ? 'New booking, payment and refund updates will show here.' : 'When hosts and guests take action, you will see it here.'}
          />
        ) : (
          <ul className="space-y-2">
            {visible.map((n) => (
              <li key={n.id}>
                <NotificationRow item={n} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function NotificationRow({ item }: { item: AppNotification }) {
  const meta = kindMeta[item.kind];
  const Icon = meta.icon;
  const unread = !item.readAt;
  const className = cn(
    'flex w-full items-start gap-3 rounded-2xl border px-4 py-3.5 text-left transition-colors',
    unread ? 'border-brand-100 bg-brand-50/70 hover:bg-brand-50' : 'border-slate-200 bg-white hover:bg-slate-50',
  );
  const body = (
    <>
      <span className={cn('mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl', unread ? 'bg-white text-brand-600' : 'bg-slate-100 text-slate-500')}>
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-ink">{item.title}</span>
          <Badge tone={meta.tone}>{meta.label}</Badge>
        </span>
        <span className="mt-0.5 block text-sm text-slate-600">{item.body}</span>
        <span className="mt-1 block text-xs text-slate-500">{formatWhen(item.createdAt)}</span>
      </span>
      {unread && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-600" aria-label="Unread" />}
    </>
  );

  if (item.href) {
    return (
      <Link to={item.href} className={className} onClick={() => markNotificationRead(item.id)}>
        {body}
      </Link>
    );
  }

  return (
    <button type="button" className={className} onClick={() => markNotificationRead(item.id)}>
      {body}
    </button>
  );
}
