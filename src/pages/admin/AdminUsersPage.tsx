import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Plane, Building2, UserPlus, Trash2, Upload, Plus, Ban, CheckCircle2 } from 'lucide-react';
import type { User, UserRole } from '@/types';
import { createUser, createUsers, deleteUsers, getUsers, updateUser, type UserInput } from '@/services';
import { useAsync, errorMessage } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useQueryFlag } from '@/hooks/useQueryFlag';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Avatar, Badge, Button, ConfirmModal, ErrorState, Input, Modal, Select, Textarea } from '@/components/ui';
import { BulkImportModal, DataTable, FilterTabs, PageHeader, RowMenu, StatCard, StatGrid, roleLabel, type Column, type ImportField } from '@/components/dashboard';
import { byMonth, periodTrend } from '@/utils/analytics';
import { formatDate } from '@/utils/format';

type RoleFilter = 'all' | UserRole;
const roleTone = { tourist: 'brand', business_owner: 'warning', admin: 'solid', staff: 'neutral' } as const;
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

const ROLE_OPTIONS = ROLES.map((r) => roleLabel[r]);

const columns: Column<User>[] = [
  {
    id: 'name', header: 'User', sortValue: (u) => u.name,
    cell: (u) => <div className="flex items-center gap-3"><Avatar name={u.name} src={u.avatar} size={34} /><div className="min-w-0"><Link to={`/admin/users/${u.id}`} className="truncate font-semibold text-ink hover:text-brand-700 hover:underline">{u.name}</Link><p className="truncate text-xs text-slate-500">{u.email}</p></div></div>,
  },
  { id: 'email', header: 'Email', exportValue: (u) => u.email, cell: (u) => <span className="text-slate-600">{u.email}</span> },
  { id: 'role', header: 'Role', sortValue: (u) => roleLabel[u.role], cell: (u) => <Badge tone={roleTone[u.role]}>{roleLabel[u.role]}</Badge> },
  {
    id: 'status', header: 'Status', sortValue: (u) => (u.active === false ? 'Deactivated' : 'Active'),
    exportValue: (u) => (u.active === false ? 'Deactivated' : 'Active'),
    cell: (u) => (u.active === false ? <Badge tone="danger">Deactivated</Badge> : <Badge tone="success">Active</Badge>),
  },
  { id: 'country', header: 'Country', sortValue: (u) => u.country ?? '', cell: (u) => u.country ?? '—' },
  { id: 'joined', header: 'Joined', sortValue: (u) => u.joinedAt, cell: (u) => <span className="whitespace-nowrap text-slate-500">{formatDate(u.joinedAt)}</span> },
];

const blank = { name: '', email: '', role: 'tourist' as UserRole, phone: '', country: 'Rwanda' };

export default function AdminUsersPage() {
  useDocumentTitle('Users');
  const { user: me } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload, setData } = useAsync(getUsers);
  const [filter, setFilter] = useState<RoleFilter>('all');
  const [removing, setRemoving] = useState<{ rows: User[]; done: () => void } | null>(null);
  const [toggling, setToggling] = useState<User | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useQueryFlag('new');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [importing, setImporting] = useQueryFlag('import');
  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const all = data ?? [];
  const countries = useMemo(() => {
    const found = [...new Set(all.map((u) => u.country?.trim()).filter((c): c is string => !!c))].sort((a, b) => a.localeCompare(b));
    return found.includes('Rwanda') ? found : ['Rwanda', ...found];
  }, [all]);
  const importFields: ImportField[] = useMemo(() => [
    { key: 'name', label: 'Full name', required: true, example: 'Aline Mukamana' },
    { key: 'email', label: 'Email', required: true, example: 'aline@example.com' },
    { key: 'role', label: 'Role', example: ROLE_OPTIONS[0], options: ROLE_OPTIONS, hint: 'Use the Excel dropdown.' },
    { key: 'phone', label: 'Phone', example: '+250 788 555 010' },
    { key: 'country', label: 'Country', example: countries[0] ?? 'Rwanda', options: countries, strict: false, hint: 'Use the dropdown, or type a new country.' },
  ], [countries]);
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

  const openToggle = (u: User) => { setReason(''); setToggling(u); };

  const toggleActive = async () => {
    if (!toggling) return;
    const active = toggling.active === false;
    setBusy(true);
    try {
      const updated = await updateUser(toggling.id, { active, reason: active ? undefined : (reason.trim() || undefined) });
      setData((l) => l?.map((u) => (u.id === updated.id ? updated : u)));
      toast.success(active ? `${updated.name} can sign in again.` : `${updated.name} was deactivated.`);
      setToggling(null);
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
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const created = await createUser({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        role: form.role,
        phone: form.phone.trim() || undefined,
        country: form.country.trim() || undefined,
      });
      setData((l) => [created, ...(l ?? [])]);
      toast.success(`${created.name} added as ${roleLabel[created.role].toLowerCase()}. A unique password was generated and emailed to them.`);
      setAdding(false);
      setForm(blank);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const openEdit = (u: User) => {
    setErrors({});
    setForm({
      name: u.name,
      email: u.email,
      role: ROLES.includes(u.role) ? u.role : 'tourist',
      phone: u.phone ?? '',
      country: u.country ?? 'Rwanda',
    });
    setEditingUser(u);
  };

  const saveEdit = async () => {
    if (!editingUser) return;
    const e: Record<string, string> = {};
    if (form.name.trim().length < 2) e.name = 'Enter the full name.';
    if (!isEmail(form.email)) e.email = 'Enter a valid email address.';
    else if (existing.has(form.email.trim().toLowerCase()) && form.email.trim().toLowerCase() !== editingUser.email.toLowerCase()) e.email = 'An account with this email already exists.';
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const patch: Parameters<typeof updateUser>[1] = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || undefined,
        country: form.country.trim() || undefined,
      };
      if (ROLES.includes(editingUser.role)) patch.role = form.role;
      const updated = await updateUser(editingUser.id, patch);
      setData((l) => l?.map((u) => (u.id === updated.id ? updated : u)));
      toast.success(`${updated.name}'s details were saved.`);
      setEditingUser(null);
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
    const value: UserInput | undefined = errs.length ? undefined : { name: r.name.trim(), email, role: role!, phone: r.phone?.trim(), country: r.country?.trim() };
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
        rowActions={(u) => (
          <RowMenu
            items={[
              { label: 'Edit', onSelect: () => openEdit(u) },
              u.active === false
                ? { label: 'Activate', icon: CheckCircle2, onSelect: () => openToggle(u) }
                : { label: 'Deactivate', icon: Ban, tone: 'danger', disabled: u.id === me?.id, onSelect: () => openToggle(u) },
              { label: 'Delete', icon: Trash2, tone: 'danger', disabled: u.id === me?.id, onSelect: () => setRemoving({ rows: [u], done: () => {} }) },
            ]}
          />
        )}
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
          <p className="text-xs text-slate-500 sm:col-span-2">No password needed — we generate a unique one for every account and email it to them.</p>
        </div>
      </Modal>

      <Modal
        open={!!editingUser}
        onClose={() => setEditingUser(null)}
        title={`Edit ${editingUser?.name ?? 'user'}`}
        footer={<><Button variant="ghost" onClick={() => setEditingUser(null)}>Cancel</Button><Button onClick={saveEdit} loading={busy}>Save changes</Button></>}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Input label="Full name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} /></div>
          <Input label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} />
          {editingUser && ROLES.includes(editingUser.role) ? (
            <Select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })} options={ROLES.map((r) => ({ value: r, label: roleLabel[r] }))} />
          ) : (
            editingUser && (
              <div>
                <span className="mb-2 block text-sm font-semibold text-ink">Role</span>
                <Badge tone={roleTone[editingUser.role]}>{roleLabel[editingUser.role]}</Badge>
              </div>
            )
          )}
          <Input label="Phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+250 788 000 000" />
          <Input label="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          <p className="text-xs text-slate-500 sm:col-span-2">Passwords can't be edited here. Ask the person to use “Forgot password” on the login page if they need a reset link.</p>
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

      <ConfirmModal
        open={!!toggling}
        variant={toggling?.active === false ? 'primary' : 'danger'}
        title={toggling?.active === false ? `Activate ${toggling?.name}?` : `Deactivate ${toggling?.name}?`}
        message={toggling?.active === false
          ? 'They will be able to sign in and use Tourista again right away.'
          : `${toggling?.name ?? 'This person'} will be signed out and blocked from logging in. Their bookings, reviews and listings stay on record. We email them your reason below.`}
        confirmLabel={toggling?.active === false ? 'Activate' : 'Deactivate'}
        acknowledge={toggling?.active === false ? undefined : 'I understand this person will lose access immediately.'}
        confirmDisabled={toggling?.active !== false && !reason.trim()}
        loading={busy}
        onConfirm={toggleActive}
        onCancel={() => setToggling(null)}
      >
        {toggling?.active !== false && (
          <Textarea
            label="Reason (emailed to them)"
            value={reason}
            maxLength={500}
            onChange={(e) => setReason(e.target.value)}
            hint="Required. It is included in the email we send them."
            placeholder="e.g. This account broke our community rules. Reply to this email if you think it is a mistake."
          />
        )}
      </ConfirmModal>
    </>
  );
}
