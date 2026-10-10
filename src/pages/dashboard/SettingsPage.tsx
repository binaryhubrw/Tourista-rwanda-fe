import { useState } from 'react';
import { useToast } from '@/context/ToastContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Bell, Coins, Languages } from 'lucide-react';
import { PageHeader, StatCard, StatGrid } from '@/components/dashboard';
import { Button, ConfirmModal, Select } from '@/components/ui';
import { resetMockDb } from '@/services/mockDb';
import { USE_MOCK } from '@/services/config';

const languages = [{ value: 'en', label: 'English' }, { value: 'rw', label: 'Kinyarwanda' }, { value: 'fr', label: 'Français' }, { value: 'sw', label: 'Kiswahili' }];
const currencies = [{ value: 'RWF', label: 'Rwandan franc (RWF)' }, { value: 'USD', label: 'US dollar (USD)' }, { value: 'EUR', label: 'Euro (EUR)' }];

export default function SettingsPage() {
  useDocumentTitle('Settings');
  const toast = useToast();
  const [prefs, setPrefs] = useState({ bookingEmails: true, reviewReplies: true, newsletter: false, currency: 'RWF', language: 'en' });
  const [resetOpen, setResetOpen] = useState(false);

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
          <div className="sm:col-span-2"><Button onClick={() => toast.success('Settings saved.')}>Save settings</Button></div>
        </section>
        {USE_MOCK && (
          <section className="rounded-3xl border border-red-100 bg-white p-5 sm:p-7">
            <h2 className="font-display text-lg font-bold text-ink">Demo data</h2>
            <p className="mt-1 text-sm text-slate-600">Restore the original sample itineraries, reviews, bookings and listings on this device.</p>
            <Button variant="secondary" className="mt-4 border-red-600 text-red-700 hover:bg-red-50" onClick={() => setResetOpen(true)}>Reset demo data</Button>
          </section>
        )}
      </div>
      <ConfirmModal open={resetOpen} title="Reset all demo data?" message="Everything you created on this device (itineraries, reviews, bookings and listings) will be replaced with the original samples." confirmLabel="Reset data" onCancel={() => setResetOpen(false)} onConfirm={() => { resetMockDb(); setResetOpen(false); toast.success('Demo data restored.'); }} />
    </>
  );
}
