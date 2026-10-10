import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { errorMessage } from '@/hooks/useAsync';
import { BadgeCheck, CalendarDays, Globe2, UserCheck } from 'lucide-react';
import { Avatar, Button, Input } from '@/components/ui';
import { PageHeader, StatCard, StatGrid, roleLabel } from '@/components/dashboard';
import { formatDate } from '@/utils/format';

export default function ProfilePage() {
  useDocumentTitle('Profile');
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ name: user!.name, email: user!.email, phone: user!.phone ?? '', country: user!.country ?? '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fields = [user!.name, user!.email, user!.phone, user!.country];
  const completeness = Math.round((fields.filter(Boolean).length / fields.length) * 100);
  const memberDays = Math.max(0, Math.floor((Date.now() - new Date(user!.joinedAt).getTime()) / 86_400_000));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.name.trim().length < 2) return setError('Enter your full name.');
    setError('');
    setSaving(true);
    try {
      await updateUser({ ...user!, ...form, name: form.name.trim() });
      toast.success('Profile saved.');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="Profile" intro="How you appear to hosts, travellers and the Tourista team." />
      <StatGrid className="mb-6">
        <StatCard label="Member since" icon={CalendarDays} value={formatDate(user!.joinedAt, { month: 'short', year: 'numeric' })} hint={`${memberDays.toLocaleString()} days on Tourista`} />
        <StatCard label="Account type" icon={BadgeCheck} tone="violet" value={roleLabel[user!.role]} />
        <StatCard label="Profile complete" icon={UserCheck} tone={completeness === 100 ? 'teal' : 'amber'} value={`${completeness}%`} hint={completeness === 100 ? 'All details filled in' : 'Add your phone and country'} />
        <StatCard label="Country" icon={Globe2} tone="slate" value={user!.country || '—'} />
      </StatGrid>
      <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
        <div className="mb-6 flex items-center gap-4">
          <Avatar name={user!.name} size={64} />
          <div><p className="font-display text-xl font-bold text-ink">{user!.name}</p><p className="text-sm text-slate-500">{roleLabel[user!.role]}, member since {formatDate(user!.joinedAt, { month: 'long', year: 'numeric' })}</p></div>
        </div>
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2" noValidate>
          <Input label="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={error} />
          <Input label="Email" type="email" value={form.email} disabled hint="Contact support to change your email." />
          <Input label="Phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+250 788 000 000" />
          <Input label="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="Rwanda" />
          <div className="sm:col-span-2"><Button type="submit" loading={saving}>Save profile</Button></div>
        </form>
      </div>
    </>
  );
}
