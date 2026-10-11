import { DEMO_HIRE_ID, DEMO_INN_ID } from './vehicles';

export const STAFF_ROLES = ['Manager'] as const;

export function staffRole(_title?: string) {
  return 'Manager';
}

/** Fill-in account on the login page. Manages the demo Kigali Wheels branches. */
export const DEMO_STAFF_LOGIN = {
  label: 'Staff',
  name: 'Jean-Paul Habimana',
  email: 'jeanpaul.habimana@kigaliwheels.rw',
  password: 'staff1234',
};

export interface StaffSeed {
  id: string;
  name: string;
  email: string;
  password: string;
  phone: string;
  joinedAt: string;
  preferHire?: boolean;
  assignedListingIds?: string[];
  active?: boolean;
}

/** One manager per listing in the demo team. */
export const DEMO_STAFF: StaffSeed[] = [
  { id: 'staff-demo-jeanpaul', name: DEMO_STAFF_LOGIN.name, email: DEMO_STAFF_LOGIN.email, password: DEMO_STAFF_LOGIN.password, phone: '+250 788 221 001', joinedAt: '2026-02-10T08:00:00.000Z', preferHire: true, assignedListingIds: [DEMO_HIRE_ID, DEMO_INN_ID] },
  { id: 'staff-demo-alice', name: 'Alice Mukamana', email: 'alice.mukamana@virunga.rw', password: 'staff1234', phone: '+250 788 221 002', joinedAt: '2026-03-04T09:00:00.000Z' },
  { id: 'staff-demo-eric', name: 'Eric Niyonsenga', email: 'eric.niyonsenga@virunga.rw', password: 'staff1234', phone: '+250 788 221 003', joinedAt: '2026-04-18T10:00:00.000Z' },
  { id: 'staff-demo-diane', name: 'Diane Uwase', email: 'diane.uwase@virunga.rw', password: 'staff1234', phone: '+250 788 221 004', joinedAt: '2026-05-22T11:00:00.000Z' },
];

export const REMOVED_STAFF_IDS = ['staff-demo-patrick', 'staff-demo-grace'];
