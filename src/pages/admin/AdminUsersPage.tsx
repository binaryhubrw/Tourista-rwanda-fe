import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Plane, Building2, UserPlus, Trash2, Upload, Plus } from 'lucide-react';
import type { User, UserRole } from '@/types';
import { createUser, createUsers, deleteUsers, getUsers, type UserInput } from '@/services';
import { useAsync, errorMessage } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useQueryFlag } from '@/hooks/useQueryFlag';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Avatar, Badge, Button, ConfirmModal, ErrorState, Input, Modal, Select } from '@/components/ui';
import { BulkImportModal, DataTable, FilterTabs, PageHeader, StatCard, StatGrid, roleLabel, type Column, type ImportField } from '@/components/dashboard';
import { byMonth, periodTrend } from '@/utils/analytics';
import { formatDate } from '@/utils/format';

type RoleFilter = 'all' | UserRole;
const roleTone = { tourist: 'brand', business_owner: 'warning', admin: 'solid' } as const;
const ROLES: UserRole[] = ['tourist', 'business_owner', 'admin'];
const isEmail = (v: string) => /^\S+@\S+\.\S+$/.test(v);

/** Accepts "tourist", "Traveller", "business owner", "business_owner", "owner", "admin"… */
function parseRole(v: string): UserRole | null {
  const k = v.trim().toLowerCase().replace(/[\s_-]+/g, '');
  if (!k || ['tourist', 'traveller', 'traveler'].includes(k)) return 'tourist';
  if (['businessowner', 'business', 'owner', 'host'].includes(k)) return 'business_owner';
  if (['admin', 'administrator'].includes(k)) return 'admin';
  return null;
}

const importFields: ImportField[] = [
  { key: 'name', label: 'Full name', required: true, example: 'Aline Mukamana' },
  { key: 'email', label: 'Email', required: true, example: 'aline@example.com' },
  { key: 'role', label: 'Role', example: 'tourist', hint: 'tourist, business owner or admin. Defaults to tourist.' },
  { key: 'phone', label: 'Phone', example: '+250 788 555 010' },
  { key: 'country', label: 'Country', example: 'Rwanda' },
  { key: 'password', label: 'Password', example: 'welcome123', hint: 'At least 6 characters. Defaults to "password".' },
];

const columns: Column<User>[] = [
  {
    id: 'name', header: 'User', sortValue: (u) => u.name,
    cell: (u) => <div className="flex items-center gap-3"><Avatar name={u.name} src={u.avatar} size={34} /><div className="min-w-0"><Link to={`/admin/users/${u.id}`} className="truncate font-semibold text-ink hover:text-brand-700 hover:underline">{u.name}</Link><p className="truncate text-xs text-slate-500">{u.email}</p></div></div>,
  },
  { id: 'email', header: 'Email', exportValue: (u) => u.email, cell: (u) => <span className="text-slate-600">{u.email}</span> },
  { id: 'role', header: 'Role', sortValue: (u) => roleLabel[u.role], cell: (u) => <Badge tone={roleTone[u.role]}>{roleLabel[u.role]}</Badge> },
  { id: 'country', header: 'Country', sortValue: (u) => u.country ?? '', cell: (u) => u.country ?? '—' },
  { id: 'joined', header: 'Joined', sortValue: (u) => u.joinedAt, cell: (u) => <span className="whitespace-nowrap text-slate-500">{formatDate(u.joinedAt)}</span> },
];

const blank = { name: '', email: '', role: 'tourist' as UserRole, phone: '', country: 'Rwanda', password: '' };

export default function AdminUsersPage() {
  useDocumentTitle('Users');
  const { user: me } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload, setData } = useAsync(getUsers);
  const [filter, setFilter] = useState<RoleFilter>('all');
  const [removing, setRemoving] = useState<{ rows: User[]; done: () => void } | null>(null);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useQueryFlag('new');
  const [importing, setImporting] = useQueryFlag('import');
  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const all = data ?? [];
  const list = useMemo(() => all.filter((u) => filter === 'all' || u.role === filter), [all, filter]);
  const newUsers = periodTrend(all, (u) => u.joinedAt, () => 1, 90);
  const monthly = byMonth(all, (u) => u.joinedAt, { users: () => 1 });
  const count = (r: UserRole) => all.filter((u) => u.role === r).length;
  const existing = useMemo(() => new Set(all.map((u) => u.email.toLowerCase())), [all]);

  const remove = async () => {
    if (!removing) return;
    setBusy(true);
    try {
      const ids = removing.rows.map((u) => u.id);
      await deleteUsers(ids);
      setData((l) => l?.filter((u) => !ids.includes(u.id)));
      toast.success(`${ids.length} account${ids.length > 1 ? 's' : ''} removed.`);
      removing.done();
      setRemoving(null);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 2) e.name = 'Enter the full name.';
    if (!isEmail(form.email)) e.email = 'Enter a valid email address.';
    else if (existing.has(form.email.trim().toLowerCase())) e.email = 'An account with this email already exists.';
    if (form.password && form.password.length < 6) e.password = 'At least 6 characters.';
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const created = await createUser(form);
      setData((l) => [created, ...(l ?? [])]);
      toast.success(`${created.name} added as ${roleLabel[created.role].toLowerCase()}.`);
      setAdding(false);
      setForm(blank);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const parseRow = (r: Record<string, string>, i: number, rows: Record<string, string>[]) => {
    const errs: string[] = [];
    const email = (r.email ?? '').trim().toLowerCase();
    const role = parseRole(r.role ?? '');
    if ((r.name ?? '').trim().length < 2) errs.push('Name is missing.');
    if (!isEmail(email)) errs.push('Email is missing or invalid.');
    else if (existing.has(email)) errs.push('Email already registered.');
    else if (rows.findIndex((x) => (x.email ?? '').trim().toLowerCase() === email) !== i) errs.push('Email repeated in this file.');
    if (!role) errs.push(`Unknown role “${r.role}”.`);
    if (r.password && r.password.length < 6) errs.push('Password under 6 characters.');
    const value: UserInput | undefined = errs.length ? undefined : { name: r.name.trim(), email, role: role!, phone: r.phone?.trim(), country: r.country?.trim(), password: r.password || undefined };
    return { value, errors: errs };
  };

  const importUsers = async (rows: UserInput[]) => {
    try {
      const created = await createUsers(rows);
      setData((l) => [...created, ...(l ?? [])]);
      toast.success(`${created.length} user${created.length === 1 ? '' : 's'} imported.`);
    } catch (e) {
      toast.error(errorMessage(e));
      throw e;
    }
  };

  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <>
      <PageHeader
        title="Users"
        intro="Everyone with an account on Tourista Rwanda."
        action={<>
          <Button variant="secondary" onClick={() => setImporting(true)}><Upload className="h-4 w-4" aria-hidden />Bulk import</Button>
          <Button onClick={() => { setForm(blank); setErrors({}); setAdding(true); }}><Plus className="h-4 w-4" aria-hidden />Add user</Button>
        </>}
      />

      <StatGrid>
        <StatCard label="Total users" icon={Users} loading={loading} value={all.length} sparkline={monthly.map((m) => m.users)} />
        <StatCard label="Travellers" icon={Plane} tone="teal" loading={loading} value={count('tourist')} hint={all.length ? `${Math.round((count('tourist') / all.length) * 100)}% of members` : undefined} />
        <StatCard label="Business owners" icon={Building2} tone="violet" loading={loading} value={count('business_owner')} />
        <StatCard label="New (90 days)" icon={UserPlus} tone="amber" loading={loading} value={newUsers.current} trend={{ value: newUsers.change, label: 'vs previous 90 days' }} />
      </StatGrid>

      <DataTable
        className="mt-6"
        data={list}
        loading={loading}
        columns={columns}
        getRowId={(u) => u.id}
        initialSort={{ id: 'joined', desc: true }}
        searchText={(u) => `${u.name} ${u.email} ${u.country ?? ''}`}
        searchPlaceholder="Search name, email or country"
        filters={
          <FilterTabs
            label="Filter by role"
            value={filter}
            onChange={setFilter}
            options={[{ value: 'all' as RoleFilter, label: 'All', count: all.length }, ...ROLES.map((r) => ({ value: r as RoleFilter, label: roleLabel[r], count: count(r) }))]}
          />
        }
        exportFileName="users"
        bulkActions={(rows, clear) => {
          const removable = rows.filter((u) => u.id !== me!.id);
          return <Button size="sm" variant="danger" disabled={!removable.length} onClick={() => setRemoving({ rows: removable, done: clear })}><Trash2 className="h-4 w-4" aria-hidden />Remove {removable.length || ''}</Button>;
        }}
        emptyTitle="No users found"
      />

      <Modal open={adding && !!data} onClose={() => setAdding(false)} title="Add a user" footer={<><Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button><Button onClick={save} loading={busy}>Create account</Button></>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Input label="Full name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} /></div>
          <Input label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} />
          <Select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })} options={ROLES.map((r) => ({ value: r, label: roleLabel[r] }))} />
          <Input label="Phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+250 788 000 000" />
          <Input label="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          <div className="sm:col-span-2"><Input label="Temporary password" type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} error={errors.password} hint={'Leave empty to use "password". Ask them to change it after signing in.'} /></div>
        </div>
      </Modal>

      <BulkImportModal open={importing && !!data} onClose={() => setImporting(false)} entity="users" fields={importFields} parse={parseRow} describe={(r) => r.name ?? ''} onImport={importUsers} />

      <ConfirmModal
        open={!!removing}
        title={`Remove ${removing?.rows.length ?? 0} account${removing && removing.rows.length > 1 ? 's' : ''}?`}
        message="These people will lose access to Tourista. Their bookings and reviews stay on record. Your own account is never included."
        confirmLabel="Remove"
        loading={busy}
        onConfirm={remove}
        onCancel={() => setRemoving(null)}
      />
    </>
  );
}
