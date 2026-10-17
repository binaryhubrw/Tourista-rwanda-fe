import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Briefcase, Pencil, Plus, Trash2, UserPlus, Users } from 'lucide-react';
import type { Business, StaffMember } from '@/types';
import { createStaff, deleteStaff, getBusinessesByOwner, getStaff, managerForListing, updateStaff } from '@/services';
import { useAsync, errorMessage } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Avatar, Badge, Button, ConfirmModal, ErrorState, Input, Loading, Modal } from '@/components/ui';
import { DataTable, PageHeader, StatCard, StatGrid, type Column } from '@/components/dashboard';
import { formatDate } from '@/utils/format';

const blank = { name: '', email: '', password: '', phone: '', listings: [] as string[] };

function listingNames(s: StaffMember, businesses: Business[]) {
  return businesses.filter((b) => s.assignedListingIds.includes(b.id));
}

export default function StaffPage() {
  useDocumentTitle('Staff');
  const { user } = useAuth();
  const toast = useToast();
  const listings = useAsync(() => getBusinessesByOwner(user!.id), [user?.id]);
  const team = useAsync(() => getStaff(), [user?.id]);
  const [editing, setEditing] = useState<StaffMember | 'new' | null>(null);
  const [removing, setRemoving] = useState<{ rows: StaffMember[]; done?: () => void } | null>(null);
  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const businesses = listings.data ?? [];
  const staff = team.data ?? [];
  const activeCount = staff.filter((s) => s.active).length;
  const covered = new Set(staff.flatMap((s) => s.assignedListingIds.filter((id) => businesses.some((b) => b.id === id)))).size;

  const columns = useMemo<Column<StaffMember>[]>(() => [
    {
      id: 'name', header: 'Staff', sortValue: (s) => s.name,
      cell: (s) => (
        <div className="flex min-w-[220px] items-center gap-3">
          <Avatar name={s.name} size={36} />
          <div className="min-w-0">
            <p className="font-semibold text-ink">{s.name}</p>
            <p className="truncate text-xs text-slate-500">{s.email}</p>
          </div>
        </div>
      ),
    },
    { id: 'phone', header: 'Phone', sortValue: (s) => s.phone ?? '', cell: (s) => <span className="whitespace-nowrap text-slate-600">{s.phone || '—'}</span> },
    {
      id: 'listings', header: 'Branches', sortValue: (s) => listingNames(s, businesses).length,
      cell: (s) => {
        const assigned = listingNames(s, businesses);
        if (!assigned.length) return <span className="text-slate-400">None</span>;
        return (
          <div className="flex max-w-[280px] flex-wrap gap-1">
            {assigned.map((b) => <Badge key={b.id} tone="neutral">{b.name}</Badge>)}
          </div>
        );
      },
    },
    { id: 'status', header: 'Status', sortValue: (s) => (s.active ? 1 : 0), cell: (s) => <Badge tone={s.active ? 'success' : 'danger'}>{s.active ? 'Active' : 'Inactive'}</Badge> },
    { id: 'joined', header: 'Added', sortValue: (s) => s.joinedAt, cell: (s) => <span className="whitespace-nowrap text-slate-500">{formatDate(s.joinedAt)}</span> },
  ], [businesses]);

  const editingId = editing && editing !== 'new' ? editing.id : undefined;
  const takenManager = (listingId: string) => managerForListing(staff, listingId, editingId);

  const open = (row: StaffMember | 'new') => {
    setEditing(row);
    setErrors({});
    const listings = row === 'new'
      ? businesses.filter((b) => !managerForListing(staff, b.id)).slice(0, 1).map((b) => b.id)
      : row.assignedListingIds;
    setForm(row === 'new'
      ? { ...blank, listings }
      : { name: row.name, email: row.email, password: '', phone: row.phone ?? '', listings });
  };

  const save = async () => {
    if (!user || !editing) return;
    const e: Record<string, string> = {};
    if (form.name.trim().length < 2) e.name = 'Enter their name.';
    if (!form.email.includes('@')) e.email = 'Enter an email they will log in with.';
    if (form.password && form.password.length < 6) e.password = 'At least 6 characters.';
    const clash = form.listings.map((id) => businesses.find((b) => b.id === id)).filter((b) => b && takenManager(b.id));
    if (clash.length) e.listings = clash.length === 1 ? `${clash[0]!.name} already has a manager.` : 'A branch can only have one manager.';
    if (!form.listings.length) e.listings = businesses.every((b) => takenManager(b.id))
      ? 'Every branch already has a manager.'
      : 'Assign at least one branch.';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      ...(form.password ? { password: form.password } : {}),
      phone: form.phone.trim() || undefined,
      assignedListingIds: form.listings,
    };
    try {
      if (editing === 'new') await createStaff(payload);
      else await updateStaff(editing.id, payload);
      toast.success(editing === 'new' ? `${form.name.trim()} was added. A unique password was generated and emailed to them.` : 'Staff details saved.');
      setEditing(null);
      await team.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const confirmRemove = async () => {
    if (!removing) return;
    try {
      await Promise.all(removing.rows.map((row) => deleteStaff(row.id)));
      toast.success(removing.rows.length > 1 ? `${removing.rows.length} staff accounts removed.` : `${removing.rows[0].name} can no longer log in.`);
      removing.done?.();
      setRemoving(null);
      await team.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const toggleActive = async (row: StaffMember) => {
    try {
      await updateStaff(row.id, {
        name: row.name,
        email: row.email,
        phone: row.phone,
        assignedListingIds: row.assignedListingIds,
        active: !row.active,
      });
      toast.success(row.active ? `${row.name} is deactivated.` : `${row.name} can log in again.`);
      await team.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  if (user?.role !== 'business_owner') return <Navigate to="/business-dashboard" replace />;
  if (listings.error) return <ErrorState message={listings.error} onRetry={listings.reload} />;
  if (team.error) return <ErrorState message={team.error} onRetry={team.reload} />;
  if (listings.loading || team.loading) return <Loading />;

  return (
    <>
      <PageHeader
        title="Staff"
        intro="One manager per branch. They can log in and work on the branches you assign — bookings, payments and vehicles included."
        action={<Button onClick={() => open('new')}><Plus className="h-4 w-4" aria-hidden />Add staff</Button>}
      />
      <StatGrid columns={3} className="sm:grid-cols-3">
        <StatCard label="All staff" icon={Users} value={staff.length} hint="They use the business dashboard for assigned branches only" />
        <StatCard label="Active" icon={Briefcase} tone="teal" value={activeCount} hint={`${staff.length - activeCount} deactivated`} />
        <StatCard label="Branches covered" icon={UserPlus} tone="violet" value={covered} hint={`${businesses.length} branch${businesses.length === 1 ? '' : 'es'} in total`} />
      </StatGrid>
      <DataTable
        className="mt-6"
        data={staff}
        columns={columns}
        getRowId={(s) => s.id}
        initialSort={{ id: 'joined', desc: true }}
        searchText={(s) => `${s.name} ${s.email} ${s.phone ?? ''} ${listingNames(s, businesses).map((b) => b.name).join(' ')}`}
        searchPlaceholder="Search staff"
        exportFileName="staff"
        bulkActions={(selected, clear) => (
          <Button size="sm" variant="danger" onClick={() => setRemoving({ rows: selected, done: clear })}>
            <Trash2 className="h-4 w-4" aria-hidden />Remove selected
          </Button>
        )}
        rowActions={(s) => (
          <div className="flex items-center justify-end gap-1">
            <Button size="sm" variant={s.active ? 'ghost' : 'secondary'} onClick={() => toggleActive(s)}>{s.active ? 'Deactivate' : 'Activate'}</Button>
            <button onClick={() => open(s)} className="inline-grid h-9 w-9 place-items-center rounded-lg text-brand-600 hover:bg-brand-50" aria-label={`Edit ${s.name}`}><Pencil className="h-4 w-4" /></button>
            <button onClick={() => setRemoving({ rows: [s] })} className="inline-grid h-9 w-9 place-items-center rounded-lg text-red-600 hover:bg-red-50" aria-label={`Remove ${s.name}`}><Trash2 className="h-4 w-4" /></button>
          </div>
        )}
        emptyTitle="No staff yet"
        emptyMessage="Add someone and assign branches. We email each new manager a unique temporary password to sign in."
        emptyAction={<Button onClick={() => open('new')}>Add staff</Button>}
      />
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Add staff' : `Edit ${form.name || 'staff'}`}
        footer={<><Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={save} loading={saving}>{editing === 'new' ? 'Save' : 'Save changes'}</Button></>}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Input label="Full name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} /></div>
          <Input label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} hint="This is their login." />
          {editing === 'new'
            ? <p className="self-end pb-2 text-xs text-slate-500">No password needed — we generate a unique one for each manager and email it to them.</p>
            : <Input label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} error={errors.password} hint="Leave blank to keep the current password." />}
          <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <fieldset className="sm:col-span-2">
            <legend className="mb-2 text-sm font-semibold text-ink">Assigned branches</legend>
            {errors.listings && <p className="mb-2 text-sm text-red-600">{errors.listings}</p>}
            <p className="mb-2 text-xs text-slate-500">Each branch can have only one manager.</p>
            <div className="space-y-2">
              {businesses.map((b) => {
                const manager = takenManager(b.id);
                return (
                  <label key={b.id} className={`flex items-start gap-2 text-sm ${manager ? 'text-slate-400' : ''}`}>
                    <input
                      type="checkbox"
                      className="mt-0.5 accent-brand-600"
                      disabled={!!manager}
                      checked={form.listings.includes(b.id)}
                      onChange={() => setForm((f) => ({ ...f, listings: f.listings.includes(b.id) ? f.listings.filter((id) => id !== b.id) : [...f.listings, b.id] }))}
                    />
                    <span>
                      {b.name}
                      {manager && <span className="mt-0.5 block text-xs">Already managed by {manager.name}</span>}
                    </span>
                  </label>
                );
              })}
              {!businesses.length && <p className="text-sm text-slate-500">Add a branch first.</p>}
            </div>
          </fieldset>
        </div>
      </Modal>
      <ConfirmModal
        open={!!removing}
        title={removing && removing.rows.length > 1 ? `Remove ${removing.rows.length} staff accounts?` : `Remove ${removing?.rows[0]?.name ?? 'this staff account'}?`}
        message="They will no longer be able to log in."
        confirmLabel="Remove"
        onCancel={() => setRemoving(null)}
        onConfirm={confirmRemove}
      />
    </>
  );
}
