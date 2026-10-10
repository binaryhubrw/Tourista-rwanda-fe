import { useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Building2, Check, Eye, EyeOff, KeyRound, Plane, ShieldCheck } from 'lucide-react';
import { useAuth, dashboardPathFor } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { errorMessage } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Button, Input, buttonClass } from '@/components/ui';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '@/data/users';
import type { UserRole } from '@/types';
import { cn } from '@/utils/cn';
import { AuthShell } from './AuthShell';

const roleIcon: Record<UserRole, typeof Plane> = { tourist: Plane, business_owner: Building2, admin: ShieldCheck };

export default function LoginPage() {
  useDocumentTitle('Log in');
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const submitRef = useRef<HTMLButtonElement>(null);

  const signIn = async (mail: string, pass: string) => {
    setError('');
    if (!mail || !pass) return setError('Enter your email and password.');
    setLoading(true);
    try {
      const user = await login(mail, pass);
      const hello = user.role === 'business_owner' && user.businessName
        ? `Welcome back, ${user.name.split(' ')[0]}. You own ${user.businessName}.`
        : `Welcome back, ${user.name.split(' ')[0]}.`;
      toast.success(hello);
      // Only honour the redirect if it's inside this user's own dashboard or the public site.
      const home = dashboardPathFor(user.role);
      const isOtherDashboard = from && ['/dashboard', '/business-dashboard', '/admin'].some((p) => from.startsWith(p) && !from.startsWith(home));
      navigate(from && !isOtherDashboard ? from : home, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    setError('');
    submitRef.current?.focus();
  };

  return (
    <AuthShell fit title="Log in" intro="Pick up where you left off: saved places, trips and bookings.">
      <section aria-labelledby="demo-title" className="mb-4 rounded-2xl border border-brand-100 bg-brand-50/60 p-3">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-brand-600" aria-hidden />
          <h2 id="demo-title" className="text-sm font-bold text-ink">Demo accounts</h2>
          <span className="ml-auto text-xs text-slate-600">Password for all: <code className="rounded bg-white px-1.5 py-0.5 font-mono font-semibold text-brand-600">{DEMO_PASSWORD}</code></span>
        </div>
        <ul className="mt-2 space-y-1.5">
          {DEMO_ACCOUNTS.map((d) => {
            const Icon = roleIcon[d.role];
            const active = email.toLowerCase() === d.email;
            return (
              <li key={d.email}>
                <div className={cn('flex items-center gap-3 rounded-xl border bg-white p-2.5 transition-colors', active ? 'border-brand-600 ring-2 ring-brand-100' : 'border-slate-200')}>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600"><Icon className="h-[18px] w-[18px]" aria-hidden /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink">{d.label}</p>
                    <p className="truncate text-xs text-slate-600">{d.description}</p>
                    <p className="truncate font-mono text-xs text-slate-500">{d.email}</p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <button type="button" onClick={() => fillDemo(d.email)} className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-300 px-2.5 text-xs font-semibold text-ink hover:border-brand-600 hover:text-brand-700" aria-label={`Fill in the ${d.label} demo account`}>
                      {active ? <><Check className="h-3.5 w-3.5" aria-hidden />Filled</> : 'Fill'}
                    </button>
                    <button type="button" disabled={loading} onClick={() => { fillDemo(d.email); signIn(d.email, DEMO_PASSWORD); }} className="inline-flex h-8 items-center rounded-lg bg-brand-600 px-2.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60" aria-label={`Sign in as the ${d.label} demo account`}>
                      Sign in
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <form onSubmit={(e) => { e.preventDefault(); signIn(email, password); }} className="space-y-3" noValidate>
        {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}
        <Input label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <div className="relative">
          <Input label="Password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="pr-11" />
          <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute bottom-1.5 right-1.5 grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-ink" aria-label={showPassword ? 'Hide password' : 'Show password'}>
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <div className="text-right"><Link to="/forgot-password" className="text-sm font-semibold text-brand-600 hover:underline">Forgot password?</Link></div>
        <Button ref={submitRef} type="submit" loading={loading} className="w-full">Log in</Button>
        <Link to="/register" className={buttonClass('secondary', 'md', 'w-full')}>Create account</Link>
      </form>
    </AuthShell>
  );
}
