import type { User, UserRole } from '@/types';

export const DEMO_PASSWORD = 'password';

/** Accounts shown on the login page so anyone can try each role. */
export const DEMO_ACCOUNTS: { role: UserRole; label: string; email: string; description: string }[] = [
  { role: 'tourist', label: 'Tourist', email: 'tourist@tourista.rw', description: 'Trips, bookings, favorites and reviews' },
  { role: 'business_owner', label: 'Business owner', email: 'business@tourista.rw', description: 'Virunga Hospitality — listings, bookings and revenue' },
  { role: 'admin', label: 'Admin', email: 'admin@tourista.rw', description: 'Platform analytics, users and moderation' },
];

type SeedUser = User & { password: string };

const demoUsers: SeedUser[] = [
  { id: 'user-tourist-1', name: 'Amani Kayitesi', email: 'tourist@tourista.rw', password: DEMO_PASSWORD, role: 'tourist', country: 'Rwanda', phone: '+250 788 000 111', joinedAt: '2025-11-02' },
  { id: 'user-business-1', name: 'Claudine Uwase', email: 'business@tourista.rw', password: DEMO_PASSWORD, role: 'business_owner', businessName: 'Virunga Hospitality', country: 'Rwanda', phone: '+250 788 123 401', bankAccount: '4001234567890123', mtnNumber: '+250 788 123 401', airtelNumber: '+250 733 123 401', joinedAt: '2025-09-14' },
  { id: 'user-admin-1', name: 'Tourista Admin', email: 'admin@tourista.rw', password: DEMO_PASSWORD, role: 'admin', country: 'Rwanda', joinedAt: '2025-06-01' },
];

// Other platform members, so the admin user list and booking customers look realistic.
const others: [string, string, string, UserRole, string, string][] = [
  ['u-lisa', 'Lisa Hartmann', 'lisa@example.com', 'tourist', 'Germany', '2025-10-03'],
  ['u-kevin', 'Kevin Nshuti', 'kevin@example.com', 'tourist', 'Rwanda', '2025-12-11'],
  ['u-grace', 'Grace Ingabire', 'grace@example.com', 'tourist', 'Rwanda', '2026-01-08'],
  ['u-sarah', 'Sarah Mitchell', 'sarah@example.com', 'tourist', 'United Kingdom', '2025-08-21'],
  ['u-tom', 'Tom Becker', 'tom@example.com', 'tourist', 'Netherlands', '2026-02-14'],
  ['u-ines', 'Inès Rousseau', 'ines@example.com', 'tourist', 'France', '2026-03-02'],
  ['u-diane', 'Diane Umutoni', 'diane@example.com', 'tourist', 'Canada', '2026-03-19'],
  ['u-james', 'James Otieno', 'james@example.com', 'tourist', 'Kenya', '2026-04-05'],
  ['u-mei', 'Mei Tanaka', 'mei@example.com', 'tourist', 'Japan', '2026-04-27'],
  ['u-carlos', 'Carlos Mendes', 'carlos@example.com', 'tourist', 'Brazil', '2026-05-16'],
  ['u-aisha', 'Aisha Bello', 'aisha@example.com', 'tourist', 'Nigeria', '2026-06-02'],
  ['u-olivia', 'Olivia Brown', 'olivia@example.com', 'tourist', 'United States', '2026-06-29'],
  ['u-patrick', 'Patrick Habimana', 'patrick@example.com', 'tourist', 'Rwanda', '2026-07-12'],
  ['u-noah', 'Noah Schmidt', 'noah@example.com', 'tourist', 'Austria', '2026-08-03'],
  ['u-fatou', 'Fatou Diallo', 'fatou@example.com', 'tourist', 'Senegal', '2026-08-25'],
  ['u-emma', 'Emma Larsen', 'emma@example.com', 'tourist', 'Denmark', '2026-09-10'],
  ['u-jean', 'Jean-Paul Mugisha', 'jeanpaul@umurage.rw', 'business_owner', 'Rwanda', '2025-07-30'],
  ['u-esther', 'Esther Mukamana', 'esther@agaseke.rw', 'business_owner', 'Rwanda', '2025-08-09'],
  ['u-eric', 'Eric Ndayisaba', 'eric@kivubikes.rw', 'business_owner', 'Rwanda', '2025-10-18'],
  ['u-alice', 'Alice Uwimana', 'alice@inzukitchen.rw', 'business_owner', 'Rwanda', '2026-01-22'],
  ['u-rdb', 'Visit Rwanda Desk', 'desk@tourista.rw', 'admin', 'Rwanda', '2025-06-01'],
];

const brandFromEmail: Record<string, { businessName: string; bankAccount: string; mtnNumber: string; airtelNumber: string }> = {
  'jeanpaul@umurage.rw': { businessName: 'Umurage', bankAccount: '4001987654321098', mtnNumber: '+250 788 111 001', airtelNumber: '+250 733 111 001' },
  'esther@agaseke.rw': { businessName: 'Agaseke', bankAccount: '4001555666777888', mtnNumber: '+250 789 222 002', airtelNumber: '+250 732 222 002' },
  'eric@kivubikes.rw': { businessName: 'Kivu Bikes', bankAccount: '4001444333222111', mtnNumber: '+250 788 333 003', airtelNumber: '+250 733 333 003' },
  'alice@inzukitchen.rw': { businessName: 'Inzu Kitchen', bankAccount: '4001222111000999', mtnNumber: '+250 789 444 004', airtelNumber: '+250 732 444 004' },
};

export const usersSeed: SeedUser[] = [
  ...demoUsers,
  ...others.map(([id, name, email, role, country, joinedAt]) => ({
    id, name, email, role, country, joinedAt, password: DEMO_PASSWORD,
    ...(role === 'business_owner' && brandFromEmail[email] ? brandFromEmail[email] : {}),
  })),
];
