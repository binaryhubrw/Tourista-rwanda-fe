import type { AppNotification, User } from '@/types';

function item(userId: string, i: number, rest: Omit<AppNotification, 'id' | 'userId'>): AppNotification {
  return { id: `n-${userId}-${i}`, userId, ...rest };
}

function inboxBase(role: User['role']) {
  return role === 'admin' ? '/admin' : role === 'tourist' ? '/dashboard' : '/business-dashboard';
}

/** First-visit inbox for each role so the header badge has something to show. */
export function seedNotifications(user: User): AppNotification[] {
  const base = inboxBase(user.role);
  const id = user.id;

  if (user.role === 'tourist') {
    return [
      item(id, 1, { kind: 'booking', title: 'Host approved your car hire', body: 'Kigali Wheels approved the Corolla for 12–15 Sep. Pay at least 30% to confirm.', href: `${base}/bookings/bkg-demo-amani-corolla`, createdAt: '2026-10-11T12:40:00.000Z' }),
      item(id, 2, { kind: 'payment', title: 'Payment approved', body: 'Your MTN payment for the Corolla hire is approved. The car is confirmed.', href: `${base}/payments`, createdAt: '2026-10-10T16:20:00.000Z' }),
      item(id, 3, { kind: 'refund', title: 'Refund completed', body: 'RWF 45,000 is back on the account you paid from.', href: `${base}/refunds`, createdAt: '2026-10-08T09:10:00.000Z' }),
      item(id, 4, { kind: 'review', title: 'A host replied to your review', body: 'Virunga Hillside Eco-Lodge thanked you for your stay notes.', href: `${base}/reviews`, createdAt: '2026-10-05T18:00:00.000Z', readAt: '2026-10-06T08:12:00.000Z' }),
      item(id, 5, { kind: 'system', title: 'Welcome to Tourista Rwanda', body: 'Save places, build an itinerary and book stays or cars from Explore.', href: '/explore', createdAt: '2026-09-20T08:00:00.000Z', readAt: '2026-09-20T08:05:00.000Z' }),
    ];
  }

  if (user.role === 'admin') {
    return [
      item(id, 1, { kind: 'payment', title: 'Payment waiting for review', body: 'A guest sent proof for a Kigali Wheels booking. Check it in Payments.', href: `${base}/payments`, createdAt: '2026-10-11T13:05:00.000Z' }),
      item(id, 2, { kind: 'refund', title: 'Refund needs a decision', body: 'A host forwarded a refund. Review it before the guest is paid back.', href: `${base}/refunds`, createdAt: '2026-10-11T10:22:00.000Z' }),
      item(id, 3, { kind: 'review', title: 'New review on a branch', body: 'A traveller rated Gorilla Gate Hotel 5 stars.', href: `${base}/reviews`, createdAt: '2026-10-10T19:40:00.000Z' }),
      item(id, 4, { kind: 'system', title: 'Weekly activity', body: 'Bookings and payments this week are on Analytics.', href: `${base}/analytics`, createdAt: '2026-10-06T07:00:00.000Z', readAt: '2026-10-06T09:30:00.000Z' }),
      item(id, 5, { kind: 'staff', title: 'New business owner joined', body: 'A host created an account. You can see them under Users.', href: `${base}/users`, createdAt: '2026-10-03T11:15:00.000Z', readAt: '2026-10-03T12:00:00.000Z' }),
    ];
  }

  if (user.role === 'staff') {
    return [
      item(id, 1, { kind: 'booking', title: 'New booking on an assigned branch', body: 'Amani Kayitesi asked to hire a Corolla for three days. Approve or decline it.', href: `${base}/bookings`, createdAt: '2026-10-11T13:18:00.000Z' }),
      item(id, 2, { kind: 'payment', title: 'Guest sent payment proof', body: 'Check the MTN screenshot for Kigali Wheels Inn and mark the payment approved.', href: `${base}/payments`, createdAt: '2026-10-11T11:02:00.000Z' }),
      item(id, 3, { kind: 'refund', title: 'Refund requested', body: 'A guest asked to cancel a hire on Kigali Wheels. Review it before it goes to admin.', href: `${base}/refunds`, createdAt: '2026-10-10T15:44:00.000Z' }),
      item(id, 4, { kind: 'review', title: 'New review on an assigned branch', body: 'Someone left 5 stars on Kigali Wheels Inn.', href: `${base}/reviews`, createdAt: '2026-10-09T08:30:00.000Z', readAt: '2026-10-09T09:01:00.000Z' }),
      item(id, 5, { kind: 'system', title: 'You manage two branches', body: 'Kigali Wheels and Kigali Wheels Inn are assigned to you. Staff cannot add branches or manage the team.', href: `${base}/business`, createdAt: '2026-10-01T08:00:00.000Z', readAt: '2026-10-01T08:20:00.000Z' }),
    ];
  }

  return [
    item(id, 1, { kind: 'booking', title: 'New booking request', body: 'Amani Kayitesi asked to hire a Corolla for three days. Approve or decline it.', href: `${base}/bookings`, createdAt: '2026-10-11T13:18:00.000Z' }),
    item(id, 2, { kind: 'payment', title: 'Guest sent payment proof', body: 'Check the MTN screenshot and mark the payment approved or send it back.', href: `${base}/payments`, createdAt: '2026-10-11T11:02:00.000Z' }),
    item(id, 3, { kind: 'refund', title: 'Refund requested', body: 'A guest asked to cancel a hire. Review it before it goes to admin.', href: `${base}/refunds`, createdAt: '2026-10-10T15:44:00.000Z' }),
    item(id, 4, { kind: 'review', title: 'New review on your branch', body: 'Someone left 5 stars on Kigali Wheels.', href: `${base}/reviews`, createdAt: '2026-10-09T08:30:00.000Z', readAt: '2026-10-09T09:01:00.000Z' }),
    item(id, 5, { kind: 'system', title: 'Payout details on file', body: 'Guests will pay the bank and mobile money numbers on your profile.', href: `${base}/profile`, createdAt: '2026-10-01T08:00:00.000Z', readAt: '2026-10-01T08:20:00.000Z' }),
  ];
}
