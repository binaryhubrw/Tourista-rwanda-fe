import type { AppNotification, Booking, Payment, PaymentMethod, Refund, RefundStage, Service, User, UserRole } from '@/types';
import { seedNotifications } from './notifications';
import { vehicleUnits } from '@/utils/catalog';
import { makeId } from '@/utils/id';
import type { PayoutTarget } from '@/utils/payment';
import { paymentTransfers, remainingDue, paymentMethodShort, paymentReference } from '@/utils/payment';
import { DEMO_BOOKINGS, DEMO_REFUNDS } from './activity';
import { DEMO_STAFF, REMOVED_STAFF_IDS, staffRole } from './staff';
import { DEMO_FLEET, DEMO_HIRE_ID, DEMO_HIRE_OWNER, DEMO_PAYOUT } from './vehicles';

export const SUBSCRIPTION_RATE = 0.1;
export const MIN_PAY_RATE = 0.3;
export const PAY_WINDOW_MS = 2 * 60 * 60 * 1000;
const KEY = 'tourista.demo.v1';

export interface StaffAccount {
  id: string;
  name: string;
  email: string;
  password: string;
  ownerId: string;
  assignedListingIds: string[];
  phone?: string;
  title?: string;
  joinedAt: string;
  /** When false they cannot log in. Missing means active. */
  active?: boolean;
}

export interface DemoState {
  bookings: Booking[];
  refunds: Refund[];
  staff: StaffAccount[];
  vehicles: Record<string, Service[]>;
  payouts: Record<string, PayoutTarget>;
  notifications: AppNotification[];
  vehiclesSeeded?: boolean;
  staffSeededOwners?: string[];
  notificationsSeeded?: string[];
}

const empty = (): DemoState => ({ bookings: [], refunds: [], staff: [], vehicles: {}, payouts: {}, notifications: [] });

function load(): DemoState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as DemoState;
    return {
      bookings: parsed.bookings ?? [],
      refunds: parsed.refunds ?? [],
      staff: parsed.staff ?? [],
      vehicles: parsed.vehicles ?? {},
      payouts: parsed.payouts ?? {},
      notifications: parsed.notifications ?? [],
      vehiclesSeeded: parsed.vehiclesSeeded,
      staffSeededOwners: parsed.staffSeededOwners,
      notificationsSeeded: parsed.notificationsSeeded,
    };
  } catch {
    return empty();
  }
}

function withDemoActivity(next: DemoState): DemoState {
  const seeds = Object.fromEntries(DEMO_BOOKINGS.map((b) => [b.id, b]));
  const patched = next.bookings.map((b) => {
    const seed = seeds[b.id];
    if (!seed?.lines?.some((line) => line.plateNumbers?.length)) return b;
    if (b.lines?.some((line) => line.plateNumbers?.length)) return b;
    return { ...b, lines: seed.lines };
  });
  const booked = new Set(patched.map((b) => b.id));
  const refundSeeds = Object.fromEntries(DEMO_REFUNDS.map((r) => [r.id, r]));
  const refundPatched = next.refunds.map((r) => {
    const seed = refundSeeds[r.id];
    if (seed?.returnTransfer && !r.returnTransfer) return { ...r, returnTransfer: seed.returnTransfer };
    return r;
  });
  const refunded = new Set(refundPatched.map((r) => r.id));
  const bookings = [...patched, ...DEMO_BOOKINGS.filter((b) => !booked.has(b.id))];
  const refunds = [...refundPatched, ...DEMO_REFUNDS.filter((r) => !refunded.has(r.id))];
  const same = bookings.length === next.bookings.length && refunds.length === next.refunds.length && bookings.every((b, i) => b === next.bookings[i]) && refunds.every((r, i) => r === next.refunds[i]);
  if (same) return next;
  return { ...next, bookings, refunds };
}

let state = withDemoActivity(load());

function persistDemoActivity() {
  const next = withDemoActivity(state);
  if (next === state) return;
  state = next;
  save();
}

function save() {
  localStorage.setItem(KEY, JSON.stringify(state));
  window.dispatchEvent(new Event('tourista-demo'));
}

function expireWindows(now = Date.now()) {
  let changed = false;
  state.bookings = state.bookings.map((b) => {
    if (b.status === 'OwnerApproved') {
      changed = true;
      return { ...b, status: 'AwaitingPayment' as const, paymentDueAt: b.paymentDueAt ?? new Date(now + PAY_WINDOW_MS).toISOString() };
    }
    if (b.status === 'AwaitingPayment' && b.paymentDueAt && new Date(b.paymentDueAt).getTime() < now) {
      changed = true;
      return { ...b, status: 'Expired' as const };
    }
    return b;
  });
  if (changed) save();
}

export function getDemoState() {
  persistDemoActivity();
  expireWindows();
  return state;
}

export function minDue(totalRwf: number) {
  return Math.max(1, Math.ceil(totalRwf * MIN_PAY_RATE));
}

export function subscriptionFee(totalRwf: number) {
  return Math.round(totalRwf * SUBSCRIPTION_RATE);
}

export function occupiesInventory(status: Booking['status']) {
  return !['Canceled', 'Declined', 'Expired', 'Refunded'].includes(status);
}

export function staffToUser(s: StaffAccount): User {
  return {
    id: s.id,
    name: s.name,
    email: s.email,
    role: 'staff',
    phone: s.phone,
    ownerId: s.ownerId,
    assignedListingIds: s.assignedListingIds,
    joinedAt: s.joinedAt,
  };
}

export function findStaffByEmail(email: string, password: string) {
  const s = getDemoState().staff.find((x) => x.email.toLowerCase() === email.trim().toLowerCase() && x.password === password);
  if (!s) return null;
  if (s.active === false) throw { message: 'This staff account is deactivated. Ask the owner to activate it.' };
  return staffToUser(s);
}

export function findStaffById(id: string) {
  const s = getDemoState().staff.find((x) => x.id === id);
  if (!s || s.active === false) return null;
  return staffToUser(s);
}

function isManager(s: Pick<StaffAccount, 'title' | 'active'>) {
  return staffRole(s.title) === 'Manager' && s.active !== false;
}

/** Active manager for this listing, if any. */
export function managerForListing(ownerId: string, listingId: string, exceptStaffId?: string) {
  return listStaff(ownerId).find((s) => isManager(s) && s.id !== exceptStaffId && s.assignedListingIds.includes(listingId)) ?? null;
}

function dedupeManagers(ownerId: string, listingIds: string[]) {
  const managers = state.staff
    .filter((s) => s.ownerId === ownerId && isManager(s))
    .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));
  const claimed = new Set<string>();
  const assigned = new Map<string, string[]>();
  managers.forEach((m) => {
    const keep = m.assignedListingIds.filter((id) => listingIds.includes(id) && !claimed.has(id));
    keep.forEach((id) => claimed.add(id));
    assigned.set(m.id, keep);
  });
  managers.forEach((m) => {
    const current = assigned.get(m.id) ?? [];
    if (current.length) return;
    const next = listingIds.find((id) => !claimed.has(id));
    if (!next) return;
    claimed.add(next);
    assigned.set(m.id, [next]);
  });
  let changed = false;
  state.staff = state.staff.map((s) => {
    const next = assigned.get(s.id);
    if (!next) return s;
    if (next.length === s.assignedListingIds.length && next.every((id) => s.assignedListingIds.includes(id))) return s;
    changed = true;
    return { ...s, assignedListingIds: next };
  });
  if (changed) save();
}

export function ensureDemoStaff(ownerId: string, listingIds: string[]) {
  persistDemoActivity();
  const before = state.staff.length;
  state.staff = state.staff.filter((s) => {
    if (REMOVED_STAFF_IDS.includes(s.id)) return false;
    if (s.ownerId === ownerId && /account/i.test(s.title ?? '')) return false;
    return true;
  });
  const emails = new Set(state.staff.map((s) => s.email.toLowerCase()));
  const ids = new Set(state.staff.map((s) => s.id));
  const used = new Set(state.staff.filter((s) => s.ownerId === ownerId).flatMap((s) => s.assignedListingIds));
  const rows = DEMO_STAFF.filter((s) => !emails.has(s.email) && !ids.has(s.id)).map((s) => {
    const prefer = s.preferHire && listingIds.includes(DEMO_HIRE_ID) && !used.has(DEMO_HIRE_ID)
      ? DEMO_HIRE_ID
      : listingIds.find((id) => !used.has(id));
    if (prefer) used.add(prefer);
    return {
      id: s.id,
      name: s.name,
      email: s.email,
      password: s.password,
      title: 'Manager',
      phone: s.phone,
      ownerId,
      assignedListingIds: prefer ? [prefer] : [],
      joinedAt: s.joinedAt,
      active: s.active !== false,
    };
  });
  const seeded = state.staffSeededOwners ?? [];
  state.staff = [...state.staff, ...rows];
  if (!seeded.includes(ownerId)) state.staffSeededOwners = [...seeded, ownerId];
  if (state.staff.length !== before || rows.length) save();
  dedupeManagers(ownerId, listingIds);
}

export function listStaff(ownerId: string) {
  return getDemoState().staff.filter((s) => s.ownerId === ownerId).map((s) => {
    const seed = DEMO_STAFF.find((row) => row.id === s.id);
    return { ...s, title: staffRole(s.title), active: s.active ?? seed?.active ?? true };
  });
}

export function upsertStaff(input: Omit<StaffAccount, 'id' | 'joinedAt'> & { id?: string }) {
  const existing = input.id ? state.staff.find((s) => s.id === input.id) : undefined;
  const emailTaken = state.staff.some((s) => s.email.toLowerCase() === input.email.trim().toLowerCase() && s.id !== existing?.id);
  if (emailTaken) throw { message: 'A staff member already uses that email.' };
  const role = staffRole(input.title?.trim() || existing?.title);
  if (role === 'Manager') {
    const taken = input.assignedListingIds.filter((id) => managerForListing(input.ownerId, id, existing?.id));
    if (taken.length) throw { message: 'That branch already has a manager.' };
  }
  const row: StaffAccount = {
    id: existing?.id ?? makeId('staff'),
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    password: input.password || existing?.password || '',
    ownerId: input.ownerId,
    assignedListingIds: input.assignedListingIds,
    phone: input.phone,
    title: role,
    joinedAt: existing?.joinedAt ?? new Date().toISOString(),
    active: input.active ?? existing?.active ?? true,
  };
  if (!row.password) throw { message: 'Set a password so they can log in.' };
  state.staff = existing ? state.staff.map((s) => (s.id === row.id ? row : s)) : [row, ...state.staff];
  save();
  return row;
}

export function removeStaff(id: string) {
  state.staff = state.staff.filter((s) => s.id !== id);
  save();
}

export function setStaffActive(id: string, active: boolean) {
  state.staff = state.staff.map((s) => (s.id === id ? { ...s, active } : s));
  save();
  return state.staff.find((s) => s.id === id);
}

export function vehiclesFor(businessId: string) {
  return getDemoState().vehicles[businessId] ?? [];
}

export function saveVehicle(businessId: string, vehicle: Service) {
  const list = vehiclesFor(businessId);
  const next = list.some((v) => v.id === vehicle.id) ? list.map((v) => (v.id === vehicle.id ? vehicle : v)) : [...list, vehicle];
  state.vehicles = { ...state.vehicles, [businessId]: next };
  save();
  return vehicle;
}

export function removeVehicle(businessId: string, vehicleId: string) {
  state.vehicles = { ...state.vehicles, [businessId]: vehiclesFor(businessId).filter((v) => v.id !== vehicleId) };
  save();
}

export function persistFleet(businessId: string, vehicles: Service[]) {
  state.vehicles = { ...state.vehicles, [businessId]: vehicles.filter((v) => v.group === 'vehicle') };
  save();
}

function withSeededCarPhotos(service: Service): Service {
  const seed = DEMO_FLEET.find((item) => item.id === service.id);
  if (!seed?.units?.length) return service;
  const current = vehicleUnits(service);
  const shared = current.length > 1 && current.every((unit) => unit.image === current[0]?.image);
  const byPlate = Object.fromEntries(seed.units.map((unit) => [unit.plate, unit.image]));
  const units = current.map((unit) => {
    const photo = byPlate[unit.plate];
    if (photo && (shared || !unit.image || unit.image.includes('photo-1606664515524'))) return { ...unit, image: photo };
    return unit;
  });
  return { ...service, units, image: units[0]?.image || service.image };
}

export function mergeVehicles(business: { id: string; services: Service[] }) {
  const extras = vehiclesFor(business.id);
  const extraById = Object.fromEntries(extras.map((v) => [v.id, v]));
  const ids = new Set(business.services.map((s) => s.id));
  return {
    ...business,
    services: [
      ...business.services.map((s) => withSeededCarPhotos(extraById[s.id] ?? s)),
      ...extras.filter((v) => !ids.has(v.id)).map(withSeededCarPhotos),
    ],
  };
}

export function setOwnerPayout(ownerId: string, payout: PayoutTarget) {
  state.payouts = { ...state.payouts, [ownerId]: payout };
  save();
}

export function payoutForOwner(ownerId?: string) {
  if (!ownerId) return null;
  return getDemoState().payouts[ownerId] ?? (ownerId === DEMO_HIRE_OWNER ? DEMO_PAYOUT : null);
}

export function demoBookings() {
  return getDemoState().bookings;
}

export function demoBooking(id: string) {
  const key = decodeURIComponent(id).toLowerCase();
  return getDemoState().bookings.find((b) => b.id.toLowerCase() === key);
}

export function upsertDemoBooking(booking: Booking) {
  const i = state.bookings.findIndex((b) => b.id === booking.id);
  if (i >= 0) state.bookings[i] = booking;
  else state.bookings = [booking, ...state.bookings];
  save();
  return booking;
}

export function refundsForBooking(bookingId: string) {
  return getDemoState().refunds.filter((r) => r.bookingId === bookingId);
}

export function demoRefunds() {
  return getDemoState().refunds;
}

export function demoRefund(id: string) {
  const key = decodeURIComponent(id).toLowerCase();
  return getDemoState().refunds.find((r) => r.id.toLowerCase() === key);
}

function patchRefund(id: string, fn: (r: Refund) => Refund) {
  state.refunds = state.refunds.map((r) => (r.id === id ? fn(r) : r));
  save();
  return state.refunds.find((r) => r.id === id)!;
}

export function createDemoBooking(input: Omit<Booking, 'id' | 'status' | 'createdAt' | 'payment'> & { status?: Booking['status'] }): Booking {
  const booking: Booking = {
    ...input,
    id: makeId('bkg'),
    status: input.status ?? 'Pending',
    createdAt: new Date().toISOString(),
  };
  return upsertDemoBooking(booking);
}

export function ownerDecide(id: string, approve: boolean, reason?: string) {
  const b = demoBooking(id);
  if (!b || b.status !== 'Pending') throw { message: 'This booking is not waiting for the host.' };
  return upsertDemoBooking({
    ...b,
    status: approve ? 'AwaitingPayment' : 'Declined',
    paymentDueAt: approve ? new Date(Date.now() + PAY_WINDOW_MS).toISOString() : undefined,
    declinedReason: approve ? undefined : (reason?.trim() || 'Declined by the host.'),
  });
}

export function adminOpenPayment(id: string) {
  const b = demoBooking(id);
  if (!b || (b.status !== 'OwnerApproved' && b.status !== 'AwaitingPayment' && b.status !== 'Pending')) {
    throw { message: 'The host must approve this booking first.' };
  }
  return upsertDemoBooking({
    ...b,
    status: 'AwaitingPayment',
    paymentDueAt: b.paymentDueAt ?? new Date(Date.now() + PAY_WINDOW_MS).toISOString(),
  });
}

export function submitPaymentProof(
  id: string,
  input: { method: PaymentMethod; senderName: string; senderAccount: string; screenshot: string; amountRwf: number; sentTo: string; sentToLabel: string },
) {
  expireWindows();
  const b = demoBooking(id);
  if (!b) throw { message: 'This booking is not open for payment.' };
  const first = !b.payment;
  if (first && b.status !== 'AwaitingPayment') throw { message: 'This booking is not open for payment.' };
  if (!first && !['AwaitingPayment', 'PaymentReview', 'Confirmed'].includes(b.status)) {
    throw { message: 'This booking is not open for payment.' };
  }
  if (first && b.paymentDueAt && new Date(b.paymentDueAt).getTime() < Date.now()) {
    upsertDemoBooking({ ...b, status: 'Expired' });
    throw { message: 'The two-hour payment window has closed.' };
  }
  const remaining = remainingDue(b);
  if (remaining <= 0) throw { message: 'This booking is already paid in full.' };
  const due = minDue(b.totalRwf);
  const amount = Math.round(input.amountRwf);
  if (first && amount < due) throw { message: `Pay at least 30% (${due.toLocaleString()} RWF).` };
  if (!first && amount < 1) throw { message: 'Enter how much you sent.' };
  if (amount > remaining) throw { message: `You can send up to ${remaining.toLocaleString()} RWF remaining.` };
  const transfer = {
    id: makeId('trn'),
    method: input.method,
    senderName: input.senderName.trim(),
    senderAccount: input.senderAccount.trim(),
    amountRwf: amount,
    screenshot: input.screenshot,
    sentTo: input.sentTo,
    sentToLabel: input.sentToLabel,
    reference: paymentReference(input.method),
    paidAt: new Date().toISOString(),
    status: 'Pending' as const,
  };
  const transfers = [...paymentTransfers(b.payment), transfer];
  const payment: Payment = {
    id: b.payment?.id ?? makeId('pay'),
    method: input.method,
    status: 'Pending',
    ledger: b.payment?.ledger === 'approved' ? 'approved' : 'pending',
    account: input.senderAccount,
    senderAccount: input.senderAccount,
    senderName: input.senderName.trim(),
    screenshot: input.screenshot,
    reference: transfer.reference,
    amountRwf: transfers.reduce((sum, t) => sum + t.amountRwf, 0),
    minDueRwf: due,
    feeRwf: subscriptionFee(b.totalRwf),
    paidAt: transfer.paidAt,
    sentTo: input.sentTo,
    sentToLabel: input.sentToLabel,
    transfers,
  };
  const nextStatus = first || b.status === 'AwaitingPayment' ? 'PaymentReview' : b.status;
  return upsertDemoBooking({ ...b, status: nextStatus, payment });
}

export function ownerConfirmPayment(id: string) {
  const b = demoBooking(id);
  if (!b?.payment) throw { message: 'There is no payment proof to confirm.' };
  const transfers = paymentTransfers(b.payment);
  const pending = transfers.some((t) => t.status === 'Pending');
  if (!pending && b.status !== 'PaymentReview') throw { message: 'There is no payment proof to confirm.' };
  return upsertDemoBooking({
    ...b,
    status: 'Confirmed',
    payment: {
      ...b.payment,
      status: 'Paid',
      ledger: 'approved',
      transfers: transfers.map((t) => ({ ...t, status: 'Paid' as const })),
    },
  });
}

export function cancelDemoBooking(id: string) {
  const b = demoBooking(id);
  if (!b) throw { message: 'Booking was not found.' };
  if (['Canceled', 'Refunded', 'Declined'].includes(b.status)) return b;
  if (b.payment?.status === 'Paid') throw { message: 'Ask for a refund instead of canceling a paid booking.' };
  return upsertDemoBooking({ ...b, status: 'Canceled' });
}

export function requestRefund(
  bookingId: string,
  input: { reason: string; proof?: string; amountRwf?: number; receiveMethod: PaymentMethod; receiveAccount: string; receiveName: string },
  actor: { name: string; role: UserRole },
) {
  const b = demoBooking(bookingId);
  if (!b?.payment || b.payment.status !== 'Paid') throw { message: 'Only a confirmed payment can be refunded.' };
  if (state.refunds.some((r) => r.bookingId === bookingId && !['completed', 'rejected', 'canceled'].includes(r.status))) {
    throw { message: 'A refund is already in progress.' };
  }
  const amount = Math.round(input.amountRwf ?? b.payment.amountRwf);
  if (amount < 1 || amount > b.payment.amountRwf) throw { message: 'Refund amount must be between 1 RWF and what you paid.' };
  const refund: Refund = {
    id: makeId('rfd'),
    paymentId: b.payment.id ?? b.id,
    bookingId,
    amountRwf: amount,
    status: 'admin_review',
    reason: input.reason.trim(),
    travelerProof: input.proof,
    receiveMethod: input.receiveMethod,
    receiveAccount: input.receiveAccount.trim(),
    receiveName: input.receiveName.trim(),
    steps: [{ at: new Date().toISOString(), by: actor.name, role: actor.role, action: 'Requested a refund', note: input.reason.trim(), proof: input.proof }],
  };
  state.refunds = [refund, ...state.refunds];
  upsertDemoBooking({ ...b, status: 'RefundPending' });
  return refund;
}

export function advanceRefund(
  refundId: string,
  next: RefundStage,
  actor: { name: string; role: UserRole },
  note?: string,
  proof?: string,
) {
  const refund = demoRefund(refundId);
  if (!refund) throw { message: 'Refund was not found.' };
  const action =
    next === 'returning' && (refund.status === 'admin_review' || refund.status === 'requested' || refund.status === 'owner_review')
      ? 'Admin approved the refund. The host will return the money.'
      : next === 'completed' ? 'Host sent the refund to the traveller.'
        : next === 'rejected' ? 'Admin rejected the refund.'
          : next === 'canceled' ? 'Traveller canceled the refund request.'
            : 'Refund updated.';
  const updated = patchRefund(refundId, (r) => ({
    ...r,
    status: next,
    ownerReturnProof: proof && (next === 'returning' || next === 'completed') ? (proof || r.ownerReturnProof) : r.ownerReturnProof,
    travelerReceivedProof: proof && next === 'completed' ? proof : r.travelerReceivedProof,
    steps: [...r.steps, { at: new Date().toISOString(), by: actor.name, role: actor.role, action, note, proof }],
  }));
  const booking = demoBooking(refund.bookingId);
  if (booking?.payment) {
    if (next === 'completed') {
      upsertDemoBooking({ ...booking, status: 'Refunded', payment: { ...booking.payment, status: 'Refunded', ledger: 'refunded' } });
    } else if (next === 'rejected' || next === 'canceled') {
      upsertDemoBooking({ ...booking, status: 'Confirmed' });
    }
  }
  return updated;
}

const refundStillOpen = (status: RefundStage) => ['requested', 'owner_review', 'admin_review'].includes(status);

export function completeRefundByOwner(
  refundId: string,
  input: { method: PaymentMethod; senderName: string; senderAccount: string; senderAddress: string; proof: string },
  actor: { name: string; role: UserRole },
) {
  const refund = demoRefund(refundId);
  if (!refund) throw { message: 'Refund was not found.' };
  if (refund.status !== 'returning') throw { message: 'Admin must approve this refund first.' };
  if (actor.role !== 'business_owner' && actor.role !== 'staff') throw { message: 'Only the host can complete this refund.' };
  if (!refund.receiveAccount || !refund.receiveName) throw { message: 'This refund has no traveller account to send to.' };
  const sentAt = new Date().toISOString();
  const reference = paymentReference(input.method);
  const returnTransfer = {
    method: input.method,
    senderName: input.senderName.trim(),
    senderAccount: input.senderAccount.trim(),
    senderAddress: input.senderAddress.trim(),
    proof: input.proof,
    sentTo: refund.receiveAccount,
    sentToName: refund.receiveName,
    sentAt,
    reference,
  };
  const updated = patchRefund(refundId, (r) => ({
    ...r,
    status: 'completed' as const,
    ownerReturnProof: input.proof,
    returnTransfer,
    steps: [...r.steps, {
      at: sentAt,
      by: actor.name,
      role: actor.role,
      action: 'Host sent the refund to the traveller.',
      note: `From ${input.senderName.trim()} · ${input.senderAccount.trim()}`,
      proof: input.proof,
    }],
  }));
  const booking = demoBooking(refund.bookingId);
  if (booking?.payment) {
    upsertDemoBooking({ ...booking, status: 'Refunded', payment: { ...booking.payment, status: 'Refunded', ledger: 'refunded' } });
  }
  return updated;
}

export function cancelRefund(refundId: string, actor: { name: string; role: UserRole }) {
  const refund = demoRefund(refundId);
  if (!refund) throw { message: 'Refund was not found.' };
  if (actor.role !== 'tourist') throw { message: 'Only the traveller can cancel this refund.' };
  if (!refundStillOpen(refund.status)) throw { message: 'This refund can no longer be canceled.' };
  return advanceRefund(refundId, 'canceled', actor);
}

export function subscriptionRows() {
  return getDemoState().bookings
    .filter((b) => b.payment?.ledger === 'approved' || b.payment?.status === 'Paid' || b.payment?.status === 'Refunded')
    .map((b) => ({
      id: b.payment?.id ?? b.id,
      bookingId: b.id,
      listing: b.targetName,
      guest: b.customerName,
      paidAt: b.payment?.paidAt ?? b.createdAt,
      bookingTotal: b.totalRwf,
      paid: b.payment?.amountRwf ?? 0,
      feeRwf: b.payment?.feeRwf ?? subscriptionFee(b.totalRwf),
      method: b.payment ? paymentMethodShort[b.payment.method] : '—',
      refunded: b.payment?.status === 'Refunded' || b.status === 'Refunded',
    }));
}

export function walletEntries() {
  const fees = subscriptionRows().map((r) => ({
    id: `in-${r.id}`,
    kind: 'in' as const,
    title: `Subscription fee · ${r.listing}`,
    subtitle: r.guest,
    amount: r.feeRwf,
    at: r.paidAt,
    bookingId: r.bookingId,
  }));
  const outs = getDemoState().refunds.filter((r) => r.status === 'completed').map((r) => {
    const b = demoBooking(r.bookingId);
    const fee = b?.payment?.feeRwf ?? subscriptionFee(b?.totalRwf ?? r.amountRwf);
    return {
      id: `out-${r.id}`,
      kind: 'out' as const,
      title: `Refund reversal · ${b?.targetName ?? r.bookingId}`,
      subtitle: b?.customerName ?? 'Traveller',
      amount: fee,
      at: r.steps.at(-1)?.at ?? r.steps[0]?.at ?? new Date().toISOString(),
      bookingId: r.bookingId,
    };
  });
  return [...fees, ...outs].sort((a, b) => b.at.localeCompare(a.at));
}

export const DEMO_TOKEN_PREFIX = 'demo.';

function ensureNotifications(user: User) {
  getDemoState();
  if (state.notificationsSeeded?.includes(user.id)) return;
  const extras = seedNotifications(user);
  const have = new Set(state.notifications.map((n) => n.id));
  state.notifications = [...state.notifications, ...extras.filter((n) => !have.has(n.id))];
  state.notificationsSeeded = [...(state.notificationsSeeded ?? []), user.id];
  save();
}

export function notificationsFor(user: User) {
  ensureNotifications(user);
  return state.notifications.filter((n) => n.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function unreadNotificationCount(user: User) {
  return notificationsFor(user).filter((n) => !n.readAt).length;
}

export function markNotificationRead(id: string) {
  let changed = false;
  const now = new Date().toISOString();
  state.notifications = state.notifications.map((n) => {
    if (n.id !== id || n.readAt) return n;
    changed = true;
    return { ...n, readAt: now };
  });
  if (changed) save();
}

export function markAllNotificationsRead(userId: string) {
  const now = new Date().toISOString();
  let changed = false;
  state.notifications = state.notifications.map((n) => {
    if (n.userId !== userId || n.readAt) return n;
    changed = true;
    return { ...n, readAt: now };
  });
  if (changed) save();
}
