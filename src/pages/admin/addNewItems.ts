import { Building2, CalendarPlus, FileUp, MapPin, MessageSquarePlus, UserPlus } from 'lucide-react';
import type { AddNewItem } from '@/components/dashboard';

/** Everything an admin can create, for the "Add new" menus on overview pages. */
export const ADMIN_ADD_NEW: AddNewItem[] = [
  { label: 'User', description: 'Create one account', icon: UserPlus, to: '/admin/users?new=1' },
  { label: 'Business', description: 'List a hotel, lodge, house or service', icon: Building2, to: '/admin/businesses?new=1' },
  { label: 'Location', description: 'Add a destination to the map', icon: MapPin, to: '/admin/locations?new=1' },
  { label: 'Booking', description: 'Record a phone or desk booking', icon: CalendarPlus, to: '/admin/bookings?new=1' },
  { label: 'Review', description: 'Publish feedback collected offline', icon: MessageSquarePlus, to: '/admin/reviews?new=1' },
  { label: 'Bulk import users', description: 'Upload a CSV or JSON file', icon: FileUp, to: '/admin/users?import=1' },
  { label: 'Bulk import businesses', description: 'Upload a CSV or JSON file', icon: FileUp, to: '/admin/businesses?import=1' },
];
