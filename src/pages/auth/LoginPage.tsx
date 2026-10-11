import { useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth, dashboardPathFor } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { errorMessage } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Button, Input, LoadingOverlay, buttonClass } from '@/components/ui';
import { AuthShell } from './AuthShell';

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
        : user.role === 'staff'
          ? `Welcome back, ${user.name.split(' ')[0]}. You are signed in as staff.`
          : `Welcome back, ${user.name.split(' ')[0]}.`;
      toast.success(hello);
      const home = dashboardPathFor(user.role);
      const isOtherDashboard = from && ['/dashboard', '/business-dashboard', '/admin'].some((p) => from.startsWith(p) && !from.startsWith(home));
      navigate(from && !isOtherDashboard ? from : home, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell fit title="Log in" intro="Pick up where you left off: saved places, trips and bookings.">
      <form onSubmit={(e) => { e.preventDefault(); signIn(email, password); }} className="relative space-y-3" noValidate>
        <LoadingOverlay show={loading} label="Signing in" />
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
        <Link to="/register" state={from ? { from } : undefined} className={buttonClass('secondary', 'md', 'w-full')}>Create account</Link>
        <p className="text-center text-sm text-slate-600">Have a tourism business? <Link to="/register/business" className="font-semibold text-brand-600 hover:underline">Register a business</Link></p>
      </form>
    </AuthShell>
  );
}
