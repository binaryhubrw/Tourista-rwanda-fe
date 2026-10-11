import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, dashboardPathFor } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { errorMessage } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Button, Input, LoadingOverlay } from '@/components/ui';
import { PayoutFields } from '@/components/business/PayoutFields';
import { payoutErrors } from '@/utils/payment';
import { AuthShell } from './AuthShell';
import { PasswordInput } from './PasswordInput';

type Errors = Partial<Record<'name' | 'email' | 'password' | 'confirm' | 'businessName' | 'bankAccount' | 'mtnNumber' | 'airtelNumber' | 'form', string>>;

export default function BusinessRegisterPage() {
  useDocumentTitle('Register a business');
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from;
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', businessName: '', bankAccount: '', mtnNumber: '', airtelNumber: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const er: Errors = {};
    if (form.name.trim().length < 2) er.name = 'Enter your full name.';
    if (form.businessName.trim().length < 2) er.businessName = 'Enter the name of your business.';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) er.email = 'Enter a valid email address.';
    if (form.password.length < 8) er.password = 'Use at least 8 characters.';
    if (form.confirm !== form.password) er.confirm = "The passwords don't match.";
    Object.assign(er, payoutErrors(form));
    setErrors(er);
    if (Object.keys(er).length) return;
    setLoading(true);
    try {
      const user = await register({
        name: form.name, email: form.email, password: form.password, role: 'business_owner',
        businessName: form.businessName.trim(),
        bankAccount: form.bankAccount.replace(/\s/g, '') || undefined,
        mtnNumber: form.mtnNumber.trim() || undefined,
        airtelNumber: form.airtelNumber.trim() || undefined,
      });
      toast.success('Business account created. Add your first branch.');
      const home = dashboardPathFor(user.role);
      const isOtherDashboard = from && ['/dashboard', '/business-dashboard', '/admin'].some((p) => from.startsWith(p) && !from.startsWith(home));
      navigate(from && !isOtherDashboard ? from : '/business-dashboard/business/new', { replace: true });
    } catch (err) {
      setErrors({ form: errorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell fit start title="Register your business" intro="Create a host account, then add branches travellers can book.">
      <form onSubmit={submit} className="relative space-y-2.5 sm:space-y-3" noValidate>
        <LoadingOverlay show={loading} label="Creating account" />
        {errors.form && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{errors.form}</p>}
        <Input label="Your name" required autoComplete="name" placeholder="Aline Mukamana" value={form.name} onChange={set('name')} error={errors.name} />
        <Input label="Business name" required placeholder="Kigali Coffee Tours" value={form.businessName} onChange={set('businessName')} error={errors.businessName} hint="The company. You can add several branches under it later." />
        <PayoutFields values={form} onChange={(payout) => setForm({ ...form, ...payout })} errors={errors} />
        <Input label="Email" type="email" required autoComplete="email" placeholder="you@example.com" value={form.email} onChange={set('email')} error={errors.email} />
        <PasswordInput label="Password" placeholder="At least 8 characters" autoComplete="new-password" value={form.password} onChange={set('password')} error={errors.password} />
        <PasswordInput label="Confirm password" placeholder="Repeat your password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} />
        <Button type="submit" loading={loading} className="w-full">Create business account</Button>
        <p className="text-center text-sm text-slate-600">Already have an account? <Link to="/login" className="font-semibold text-brand-600 hover:underline">Log in</Link></p>
        <p className="text-center text-sm text-slate-600">Travelling instead? <Link to="/register" className="font-semibold text-brand-600 hover:underline">Create a traveller account</Link></p>
      </form>
    </AuthShell>
  );
}
