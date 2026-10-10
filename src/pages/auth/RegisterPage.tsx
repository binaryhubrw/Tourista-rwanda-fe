import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Compass, Store } from 'lucide-react';
import { useAuth, dashboardPathFor } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { errorMessage } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Button, Input } from '@/components/ui';
import { AuthShell } from './AuthShell';
import { cn } from '@/utils/cn';

type Role = 'tourist' | 'business_owner';
type Errors = Partial<Record<'name' | 'email' | 'password' | 'confirm' | 'form', string>>;

export default function RegisterPage() {
  useDocumentTitle('Sign up');
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [role, setRole] = useState<Role>(params.get('role') === 'business_owner' ? 'business_owner' : 'tourist');
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);

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
      const user = await register({ name: form.name, email: form.email, password: form.password, role });
      toast.success('Account created. Welcome to Tourista Rwanda.');
      navigate(role === 'business_owner' ? '/business-dashboard/business' : dashboardPathFor(user.role), { replace: true });
    } catch (err) {
      setErrors({ form: errorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { value: 'tourist' as const, icon: Compass, title: 'Tourist', text: 'Plan trips, save places, book and review.' },
    { value: 'business_owner' as const, icon: Store, title: 'Business owner', text: 'List your services and receive bookings.' },
  ];

  return (
    <AuthShell title="Create your account" intro="Join as a traveller or list your tourism business.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        {errors.form && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{errors.form}</p>}
        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold text-ink">I am a</legend>
          <div className="grid grid-cols-2 gap-3">
            {roles.map(({ value, icon: Icon, title, text }) => (
              <label key={value} className={cn('cursor-pointer rounded-2xl border p-3.5 transition-colors', role === value ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600' : 'border-slate-300 hover:border-brand-300')}>
                <input type="radio" name="role" value={value} checked={role === value} onChange={() => setRole(value)} className="sr-only" />
                <Icon className="h-5 w-5 text-brand-600" aria-hidden />
                <span className="mt-2 block font-semibold text-ink">{title}</span>
                <span className="block text-xs text-slate-600">{text}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <Input label="Full name" required autoComplete="name" value={form.name} onChange={set('name')} error={errors.name} />
        <Input label="Email" type="email" required autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} />
        <Input label="Password" type="password" required autoComplete="new-password" value={form.password} onChange={set('password')} error={errors.password} hint="At least 8 characters" />
        <Input label="Confirm password" type="password" required autoComplete="new-password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} />
        <Button type="submit" size="lg" loading={loading} className="w-full">Create account</Button>
        <p className="text-center text-sm text-slate-600">Already have an account? <Link to="/login" className="font-semibold text-brand-600 hover:underline">Log in</Link></p>
      </form>
    </AuthShell>
  );
}
