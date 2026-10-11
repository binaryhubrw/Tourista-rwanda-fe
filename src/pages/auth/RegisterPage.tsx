import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth, dashboardPathFor } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { errorMessage } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Button, Input, LoadingOverlay } from '@/components/ui';
import { AuthShell } from './AuthShell';
import { PasswordInput } from './PasswordInput';

type Errors = Partial<Record<'name' | 'email' | 'password' | 'confirm' | 'form', string>>;

export default function RegisterPage() {
  useDocumentTitle('Sign up');
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const [params] = useSearchParams();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);

  if (params.get('role') === 'business_owner') {
    return <Navigate to="/register/business" replace state={location.state} />;
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const er: Errors = {};
    if (form.name.trim().length < 2) er.name = 'Enter your full name.';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) er.email = 'Enter a valid email address.';
    if (form.password.length < 8) er.password = 'Use at least 8 characters.';
    if (form.confirm !== form.password) er.confirm = "The passwords don't match.";
    setErrors(er);
    if (Object.keys(er).length) return;
    setLoading(true);
    try {
      const user = await register({ name: form.name, email: form.email, password: form.password, role: 'tourist' });
      toast.success('Account created. Welcome to Tourista Rwanda.');
      const home = dashboardPathFor(user.role);
      const isOtherDashboard = from && ['/dashboard', '/business-dashboard', '/admin'].some((p) => from.startsWith(p) && !from.startsWith(home));
      navigate(from && !isOtherDashboard ? from : home, { replace: true });
    } catch (err) {
      setErrors({ form: errorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell fit title="Create your account" intro="Join as a traveller to plan trips, save places, book and review.">
      <form onSubmit={submit} className="relative space-y-2.5 sm:space-y-3" noValidate>
        <LoadingOverlay show={loading} label="Creating account" />
        {errors.form && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{errors.form}</p>}
        <Input label="Full name" required autoComplete="name" placeholder="Aline Mukamana" value={form.name} onChange={set('name')} error={errors.name} />
        <Input label="Email" type="email" required autoComplete="email" placeholder="you@example.com" value={form.email} onChange={set('email')} error={errors.email} />
        <PasswordInput label="Password" placeholder="At least 8 characters" autoComplete="new-password" value={form.password} onChange={set('password')} error={errors.password} />
        <PasswordInput label="Confirm password" placeholder="Repeat your password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} />
        <Button type="submit" loading={loading} className="w-full">Create account</Button>
        <p className="text-center text-sm text-slate-600">Already have an account? <Link to="/login" state={from ? { from } : undefined} className="font-semibold text-brand-600 hover:underline">Log in</Link></p>
        <p className="text-center text-sm text-slate-600">Have a tourism business? <Link to="/register/business" className="font-semibold text-brand-600 hover:underline">Register it here</Link></p>
      </form>
    </AuthShell>
  );
}
