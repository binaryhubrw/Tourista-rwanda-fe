import {
  LayoutDashboard, BarChart3, Heart, CalendarCheck, MessageSquare, Store, Package, Users, MapPin, Building2, User, Settings,
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

const ALL: UserRole[] = ['tourist', 'business_owner', 'admin'];

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
      // { label: 'Itineraries', icon: Map, path: 'itineraries', roles: ['tourist'] },
      { label: 'Bookings', icon: CalendarCheck, path: 'bookings', roles: ['tourist'] },
      { label: 'Favorites', icon: Heart, path: 'favorites', roles: ['tourist'] },
      { label: 'My reviews', icon: MessageSquare, path: 'reviews', roles: ['tourist'] },
    ],
  },
  {
    title: 'My business',
    items: [
      { label: 'Listings', icon: Store, path: 'business', roles: ['business_owner'] },
      { label: 'Rooms & services', icon: Package, path: 'services', roles: ['business_owner'] },
      { label: 'Bookings', icon: CalendarCheck, path: 'bookings', roles: ['business_owner'] },
      { label: 'Reviews', icon: MessageSquare, path: 'reviews', roles: ['business_owner'] },
    ],
  },
  {
    title: 'Platform',
    items: [
      { label: 'Users', icon: Users, path: 'users', roles: ['admin'] },
      { label: 'Locations', icon: MapPin, path: 'locations', roles: ['admin'] },
      { label: 'Businesses', icon: Building2, path: 'businesses', roles: ['admin'] },
      { label: 'Bookings', icon: CalendarCheck, path: 'bookings', roles: ['admin'] },
      { label: 'Reviews', icon: MessageSquare, path: 'reviews', roles: ['admin'] },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'Profile', icon: User, path: 'profile', roles: ALL },
      { label: 'Settings', icon: Settings, path: 'settings', roles: ALL },
    ],
  },
];

export const roleLabel: Record<UserRole, string> = {
  tourist: 'Traveller',
  business_owner: 'Business owner',
  admin: 'Admin',
};

/** Role line for a signed-in owner, e.g. "Business owner · Virunga Hospitality". */
export function ownerRoleCaption(businessName?: string) {
  const name = businessName?.trim();
  return name ? `${roleLabel.business_owner} · ${name}` : roleLabel.business_owner;
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
