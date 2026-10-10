import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Compass, Store } from 'lucide-react';
import { useAuth, dashboardPathFor } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { errorMessage } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Button, Input } from '@/components/ui';
import { PayoutFields } from '@/components/business/PayoutFields';
import { payoutErrors } from '@/utils/payment';
import { AuthShell } from './AuthShell';
import { cn } from '@/utils/cn';

type Role = 'tourist' | 'business_owner';
type Errors = Partial<Record<'name' | 'email' | 'password' | 'confirm' | 'businessName' | 'bankAccount' | 'mtnNumber' | 'airtelNumber' | 'form', string>>;

export default function RegisterPage() {
  useDocumentTitle('Sign up');
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', businessName: '', bankAccount: '', mtnNumber: '', airtelNumber: '' });
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
    if (role === 'business_owner' && form.businessName.trim().length < 2) er.businessName = 'Enter the name of your business.';
    if (role === 'business_owner') Object.assign(er, payoutErrors(form));
    setErrors(er);
    if (Object.keys(er).length) return;
    setLoading(true);
    try {
      const user = await register({
        name: form.name, email: form.email, password: form.password, role,
        businessName: form.businessName.trim() || undefined,
        bankAccount: form.bankAccount.replace(/\s/g, '') || undefined,
        mtnNumber: form.mtnNumber.trim() || undefined,
        airtelNumber: form.airtelNumber.trim() || undefined,
      });
      toast.success('Account created. Welcome to Tourista Rwanda.');
      navigate(role === 'business_owner' ? '/business-dashboard/business/new' : dashboardPathFor(user.role), { replace: true });
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
    <AuthShell fit title="Create your account" intro="Join as a traveller or list your tourism business.">
      <form onSubmit={submit} className="space-y-2.5 sm:space-y-3" noValidate>
        {errors.form && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{errors.form}</p>}
        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold text-ink">I am a</legend>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {roles.map(({ value, icon: Icon, title, text }) => (
              <label key={value} className={cn('cursor-pointer rounded-2xl border p-2.5 transition-colors sm:p-3.5', role === value ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600' : 'border-slate-300 hover:border-brand-300')}>
                <input type="radio" name="role" value={value} checked={role === value} onChange={() => setRole(value)} className="sr-only" />
                <Icon className="h-5 w-5 text-brand-600" aria-hidden />
                <span className="mt-1 block font-semibold text-ink sm:mt-2">{title}</span>
                <span className="hidden text-xs text-slate-600 sm:block">{text}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <Input label="Full name" required autoComplete="name" value={form.name} onChange={set('name')} error={errors.name} />
        {role === 'business_owner' && (
          <>
            <Input label="Business name" required value={form.businessName} onChange={set('businessName')} error={errors.businessName} hint="The company. You can add several listings under it later." />
            <PayoutFields values={form} onChange={(payout) => setForm({ ...form, ...payout })} errors={errors} />
          </>
        )}
        <Input label="Email" type="email" required autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} />
        <Input label="Password" type="password" required autoComplete="new-password" value={form.password} onChange={set('password')} error={errors.password} />
        <Input label="Confirm password" type="password" required autoComplete="new-password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} />
        <Button type="submit" loading={loading} className="w-full">Create account</Button>
        <p className="text-center text-sm text-slate-600">Already have an account? <Link to="/login" className="font-semibold text-brand-600 hover:underline">Log in</Link></p>
      </form>
    </AuthShell>
  );
}
