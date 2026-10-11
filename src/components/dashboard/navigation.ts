import {
  LayoutDashboard, BarChart3, Heart, CalendarCheck, MessageSquare, Store, Package, Users, MapPin, Map, Building2, Wallet, RotateCcw, CreditCard, Car,
  type LucideIcon,
} from 'lucide-react';
import type { UserRole } from '@/types';
import { dashboardPathFor } from '@/context/AuthContext';

export interface NavItem {
  label: string;
  icon: LucideIcon;
  /** Path relative to the role's dashboard root ('' is the overview). */
  path: string;
  roles: UserRole[];
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

/** Resolved item with an absolute link, as the sidebar renders it. */
export interface SidebarLink {
  label: string;
  icon: LucideIcon;
  to: string;
  end?: boolean;
}

export interface SidebarSection {
  title: string;
  items: SidebarLink[];
}

const ALL: UserRole[] = ['tourist', 'business_owner', 'admin', 'staff'];
const HOST: UserRole[] = ['business_owner', 'staff'];

/**
 * Single source of truth for dashboard navigation. Each item lists the roles
 * allowed to see it; the sidebar only ever shows the signed-in user's items.
 */
export const NAVIGATION: NavSection[] = [
  {
    title: 'General',
    items: [
      { label: 'Overview', icon: LayoutDashboard, path: '', roles: ALL },
      { label: 'Analytics', icon: BarChart3, path: 'analytics', roles: ['admin'] },
    ],
  },
  {
    title: 'My travel',
    items: [
      { label: 'Itineraries', icon: Map, path: 'itineraries', roles: ['tourist'] },
      { label: 'Bookings', icon: CalendarCheck, path: 'bookings', roles: ['tourist'] },
      { label: 'Payments', icon: CreditCard, path: 'payments', roles: ['tourist'] },
      { label: 'Refunds', icon: RotateCcw, path: 'refunds', roles: ['tourist'] },
      { label: 'Favorites', icon: Heart, path: 'favorites', roles: ['tourist'] },
      { label: 'My reviews', icon: MessageSquare, path: 'reviews', roles: ['tourist'] },
    ],
  },
  {
    title: 'My business',
    items: [
      { label: 'Branches', icon: Store, path: 'business', roles: HOST },
      { label: 'Rooms & services', icon: Package, path: 'services', roles: HOST },
      { label: 'Vehicles', icon: Car, path: 'vehicles', roles: HOST },
      { label: 'Bookings', icon: CalendarCheck, path: 'bookings', roles: HOST },
      { label: 'Payments', icon: CreditCard, path: 'payments', roles: HOST },
      { label: 'Refunds', icon: RotateCcw, path: 'refunds', roles: HOST },
      { label: 'Staff', icon: Users, path: 'staff', roles: ['business_owner'] },
      { label: 'Reviews', icon: MessageSquare, path: 'reviews', roles: HOST },
    ],
  },
  {
    title: 'Platform',
    items: [
      { label: 'Users', icon: Users, path: 'users', roles: ['admin'] },
      { label: 'Locations', icon: MapPin, path: 'locations', roles: ['admin'] },
      { label: 'Businesses', icon: Building2, path: 'businesses', roles: ['admin'] },
      { label: 'Bookings', icon: CalendarCheck, path: 'bookings', roles: ['admin'] },
      { label: 'Payments', icon: CreditCard, path: 'payments', roles: ['admin'] },
      { label: 'Refunds', icon: RotateCcw, path: 'refunds', roles: ['admin'] },
      { label: 'Wallet', icon: Wallet, path: 'wallet', roles: ['admin'] },
      { label: 'Reviews', icon: MessageSquare, path: 'reviews', roles: ['admin'] },
    ],
  },
];

export const roleLabel: Record<UserRole, string> = {
  tourist: 'Traveller',
  business_owner: 'Business owner',
  admin: 'Admin',
  staff: 'Staff',
};

/** Role line for a signed-in host, e.g. "Staff · Kigali Wheels". */
export function hostRoleCaption(role: UserRole, businessName?: string) {
  const name = businessName?.trim();
  const label = roleLabel[role] ?? role;
  return name ? `${label} · ${name}` : label;
}

/** Role line for a signed-in owner, e.g. "Business owner · Virunga Hospitality". */
export function ownerRoleCaption(businessName?: string) {
  return hostRoleCaption('business_owner', businessName);
}

/** The sections and links a given role is allowed to see. Empty sections are dropped. */
export function navigationFor(role: UserRole): SidebarSection[] {
  const base = dashboardPathFor(role);
  return NAVIGATION.map((section) => ({
    title: section.title,
    items: section.items
      .filter((item) => item.roles.includes(role))
      .map((item) => ({ label: item.label, icon: item.icon, to: item.path ? `${base}/${item.path}` : base, end: !item.path })),
  })).filter((section) => section.items.length > 0);
}

/** The nav link matching the current URL (longest match wins). */
export function activeLink(sections: SidebarSection[], pathname: string) {
  return sections
    .flatMap((s) => s.items)
    .filter((i) => (i.end ? pathname === i.to || pathname === `${i.to}/` : pathname.startsWith(i.to)))
    .sort((a, b) => b.to.length - a.to.length)[0];
}
