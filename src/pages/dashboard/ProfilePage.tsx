import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { errorMessage, useAsync } from '@/hooks/useAsync';
import { BadgeCheck, CalendarDays, Globe2, UserCheck } from 'lucide-react';
import { Avatar, Button, Input, Loading, LoadingOverlay } from '@/components/ui';
import { PageHeader, StatCard, StatGrid, hostRoleCaption, roleLabel } from '@/components/dashboard';
import { PayoutFields } from '@/components/business/PayoutFields';
import { getBusinessesByOwner } from '@/services';
import { formatDate } from '@/utils/format';
import { payoutErrors } from '@/utils/payment';

export default function ProfilePage() {
  useDocumentTitle('Profile');
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const listings = useAsync(() => (user!.role === 'business_owner' || user!.role === 'staff' ? getBusinessesByOwner(user!.id) : Promise.resolve([])), [user!.id, user!.role]);
  const caption = user!.role === 'business_owner' || user!.role === 'staff' ? hostRoleCaption(user!.role, user!.businessName) : roleLabel[user!.role];
  const [form, setForm] = useState({
    name: user!.name, email: user!.email, phone: user!.phone ?? '', country: user!.country ?? '', businessName: user!.businessName ?? '',
    bankAccount: user!.bankAccount ?? '', mtnNumber: user!.mtnNumber ?? '', airtelNumber: user!.airtelNumber ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [payoutErr, setPayoutErr] = useState<Partial<{ bankAccount: string; mtnNumber: string; airtelNumber: string }>>({});
  const canEditPayout = user!.role === 'business_owner' || user!.role === 'admin';
  const ownerFields = user!.role === 'business_owner'
    ? [user!.name, user!.email, user!.phone, user!.country, user!.businessName, user!.bankAccount, user!.mtnNumber, user!.airtelNumber]
    : user!.role === 'admin'
      ? [user!.name, user!.email, user!.phone, user!.country, user!.bankAccount, user!.mtnNumber, user!.airtelNumber]
      : [user!.name, user!.email, user!.phone, user!.country];
  const completeness = Math.round((ownerFields.filter(Boolean).length / ownerFields.length) * 100);
  const memberDays = Math.max(0, Math.floor((Date.now() - new Date(user!.joinedAt).getTime()) / 86_400_000));
  const listingCount = listings.data?.length ?? 0;

  if ((user!.role === 'business_owner' || user!.role === 'staff') && listings.loading) return <Loading />;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.name.trim().length < 2) return setError('Enter your full name.');
    if (user!.role === 'business_owner' && form.businessName.trim().length < 2) return setError('Enter your business name.');
    const payErr = canEditPayout ? payoutErrors(form) : {};
    setPayoutErr(payErr);
    if (Object.keys(payErr).length) return setError(user!.role === 'admin' ? 'Add the platform bank account, MTN number and Airtel number.' : 'Add a bank account, MTN number and Airtel number so guests can pay you.');
    setError('');
    setSaving(true);
    try {
      await updateUser({
        ...user!, ...form, name: form.name.trim(),
        businessName: form.businessName.trim() || undefined,
        bankAccount: form.bankAccount.replace(/\s/g, '') || undefined,
        mtnNumber: form.mtnNumber.trim() || undefined,
        airtelNumber: form.airtelNumber.trim() || undefined,
      });
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
        <StatCard label="Account type" icon={BadgeCheck} tone="violet" value={roleLabel[user!.role]} hint={user!.role === 'business_owner' ? (user!.businessName ? `${user!.businessName} · ${listingCount} branch${listingCount === 1 ? '' : 'es'}` : 'No business name yet') : user!.role === 'staff' ? `${user!.businessName ? `${user!.businessName} · ` : ''}${listingCount} assigned branch${listingCount === 1 ? '' : 'es'}` : undefined} />
        <StatCard label="Profile complete" icon={UserCheck} tone={completeness === 100 ? 'teal' : 'amber'} value={`${completeness}%`} hint={completeness === 100 ? 'All details filled in' : 'Add your phone and country'} />
        <StatCard label="Country" icon={Globe2} tone="slate" value={user!.country || '—'} />
      </StatGrid>
      <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
        <div className="mb-6 flex items-center gap-4">
          <Avatar name={user!.name} size={64} />
          <div><p className="font-display text-xl font-bold text-ink">{user!.name}</p><p className="text-sm text-slate-500">{caption}, member since {formatDate(user!.joinedAt, { month: 'long', year: 'numeric' })}</p></div>
        </div>
        <form onSubmit={save} className="relative grid gap-4 sm:grid-cols-2" noValidate>
          <LoadingOverlay show={saving} label="Saving profile" />
          <Input label="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={error && !form.businessName ? error : undefined} />
          <Input label="Email" type="email" value={form.email} disabled hint="Contact support to change your email." />
          {user!.role === 'business_owner' && (
            <Input label="Business name" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} hint="The company travellers and the dashboard will show. Branches stay separate." error={error && form.name.trim().length >= 2 && !form.businessName.trim() ? error : undefined} />
          )}
          <Input label="Phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+250 788 000 000" />
          <Input label="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="Rwanda" />
          {canEditPayout && (
            <PayoutFields values={form} onChange={(payout) => setForm({ ...form, ...payout })} errors={payoutErr} />
          )}
          <div className="sm:col-span-2"><Button type="submit" loading={saving}>Save profile</Button></div>
        </form>
      </div>
    </>
  );
}
