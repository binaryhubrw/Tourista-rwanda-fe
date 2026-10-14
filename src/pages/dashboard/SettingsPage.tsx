import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { errorMessage, useAsync } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { getMailStatus, sendTestMail } from '@/services';
import { Bell, Coins, Languages, Mail } from 'lucide-react';
import { PageHeader, StatCard, StatGrid } from '@/components/dashboard';
import { Button, Input, Select } from '@/components/ui';

const languages = [{ value: 'en', label: 'English' }, { value: 'rw', label: 'Kinyarwanda' }, { value: 'fr', label: 'Français' }, { value: 'sw', label: 'Kiswahili' }];
const currencies = [{ value: 'RWF', label: 'Rwandan franc (RWF)' }, { value: 'USD', label: 'US dollar (USD)' }, { value: 'EUR', label: 'Euro (EUR)' }];

export default function SettingsPage() {
  useDocumentTitle('Settings');
  const toast = useToast();
  const { user, updateUser } = useAuth();
  const [prefs, setPrefs] = useState({
    bookingEmails: true, reviewReplies: true, newsletter: false, currency: 'RWF', language: 'en',
    ...user?.preferences,
  });
  const [saving, setSaving] = useState(false);
  const [testTo, setTestTo] = useState(user?.email ?? '');
  const [sending, setSending] = useState(false);
  const mail = useAsync(async () => (user?.role === 'admin' ? getMailStatus() : null), [user?.role]);

  const toggles: { key: 'bookingEmails' | 'reviewReplies' | 'newsletter'; label: string; text: string }[] = [
    { key: 'bookingEmails', label: 'Booking updates', text: 'Email me when a booking is confirmed or canceled.' },
    { key: 'reviewReplies', label: 'Review replies', text: 'Email me when someone replies to my review.' },
    { key: 'newsletter', label: 'Travel ideas', text: 'A monthly email with hidden gems and seasonal events.' },
  ];

  const enabled = toggles.filter((t) => prefs[t.key]).length;

  return (
    <>
      <PageHeader title="Settings" intro="Notifications, language and currency." />
      <StatGrid columns={3} className="mb-6">
        <StatCard label="Email notifications" icon={Bell} value={`${enabled} of ${toggles.length} on`} hint={enabled ? toggles.filter((t) => prefs[t.key]).map((t) => t.label).join(', ') : 'All emails are off'} />
        <StatCard label="Language" icon={Languages} tone="violet" value={languages.find((l) => l.value === prefs.language)?.label} />
        <StatCard label="Display currency" icon={Coins} tone="amber" value={prefs.currency} hint={currencies.find((c) => c.value === prefs.currency)?.label} />
      </StatGrid>
      <div className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
          <h2 className="font-display text-lg font-bold text-ink">Notifications</h2>
          <ul className="mt-4 divide-y divide-slate-100">
            {toggles.map((t) => (
              <li key={t.key} className="flex items-center justify-between gap-4 py-3">
                <div><p className="font-semibold text-ink">{t.label}</p><p className="text-sm text-slate-600">{t.text}</p></div>
                <button role="switch" aria-checked={prefs[t.key]} aria-label={t.label} onClick={() => setPrefs({ ...prefs, [t.key]: !prefs[t.key] })} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${prefs[t.key] ? 'bg-brand-600' : 'bg-slate-300'}`}>
                  <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${prefs[t.key] ? 'left-6' : 'left-1'}`} />
                </button>
              </li>
            ))}
          </ul>
        </section>
        <section className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 sm:grid-cols-2 sm:p-7">
          <h2 className="font-display text-lg font-bold text-ink sm:col-span-2">Preferences</h2>
          <Select label="Language" value={prefs.language} onChange={(e) => setPrefs({ ...prefs, language: e.target.value })} options={languages} />
          <Select label="Currency" value={prefs.currency} onChange={(e) => setPrefs({ ...prefs, currency: e.target.value })} options={currencies} />
          <div className="sm:col-span-2">
            <Button disabled={saving} onClick={async () => {
              if (!user) return toast.success('Settings saved.');
              setSaving(true);
              try {
                await updateUser({ ...user, preferences: prefs });
                toast.success('Settings saved.');
              } catch (err) {
                toast.error(errorMessage(err));
              } finally {
                setSaving(false);
              }
            }}>Save settings</Button>
          </div>
        </section>
        {user?.role === 'admin' && (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
            <h2 className="font-display text-lg font-bold text-ink">Platform mail</h2>
            <p className="mt-1 text-sm text-slate-600">Check whether booking invoices and admin notices can leave the server, then send a test message.</p>
            {mail.loading && <p className="mt-3 text-sm text-slate-500">Checking mail…</p>}
            {mail.error && <p className="mt-3 text-sm text-red-600">{mail.error}</p>}
            {mail.data && (
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div><dt className="text-slate-500">Transport</dt><dd className="font-semibold text-ink">{mail.data.transport} ({mail.data.mode})</dd></div>
                <div><dt className="text-slate-500">From</dt><dd className="break-all font-semibold text-ink">{mail.data.from}</dd></div>
                <div><dt className="text-slate-500">Verified</dt><dd className="font-semibold text-ink">{mail.data.verified == null ? 'Not checked' : mail.data.verified ? 'Yes' : 'No'}</dd></div>
                <div><dt className="text-slate-500">Sent / failed</dt><dd className="font-semibold text-ink">{mail.data.sent} sent · {mail.data.failed} failed · {mail.data.queued} queued</dd></div>
                {mail.data.lastError && <div className="sm:col-span-2"><dt className="text-slate-500">Last error</dt><dd className="text-rose-700">{mail.data.lastError}</dd></div>}
              </dl>
            )}
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <Input type="email" label="Send a test to" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@example.com" />
              </div>
              <Button loading={sending} onClick={async () => {
                setSending(true);
                try {
                  const result = await sendTestMail(testTo.trim() || undefined);
                  toast.success(`Test mail sent to ${result.to}.`);
                  mail.reload();
                } catch (err) {
                  toast.error(errorMessage(err));
                } finally {
                  setSending(false);
                }
              }}><Mail className="h-4 w-4" aria-hidden />Send test</Button>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
