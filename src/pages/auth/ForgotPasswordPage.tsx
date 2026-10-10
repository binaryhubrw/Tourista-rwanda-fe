import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { authService } from '@/services';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Button, ButtonLink, Input, LoadingOverlay } from '@/components/ui';
import { AuthShell } from './AuthShell';

export default function ForgotPasswordPage() {
  useDocumentTitle('Forgot password');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Enter the email you signed up with.');
    setError('');
    setLoading(true);
    await authService.requestPasswordReset(email);
    setLoading(false);
    setSent(true);
  };

  if (sent) {
    return (
      <AuthShell title="Check your inbox" intro={`If ${email} has an account, we've sent a link to reset your password. It expires in one hour.`}>
        <MailCheck className="h-12 w-12 text-brand-600" aria-hidden />
        <div className="mt-6 flex flex-col gap-3">
          <ButtonLink to="/reset-password?token=demo-token" variant="secondary">Open the reset link (demo)</ButtonLink>
          <ButtonLink to="/login" variant="ghost">Back to log in</ButtonLink>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Reset your password" intro="Enter your email and we'll send you a link to choose a new password.">
      <form onSubmit={submit} className="relative space-y-4" noValidate>
        <LoadingOverlay show={loading} label="Sending link" />
        <Input label="Email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={error} />
        <Button type="submit" size="lg" loading={loading} className="w-full">Send reset link</Button>
        <p className="text-center text-sm"><Link to="/login" className="font-semibold text-brand-600 hover:underline">Back to log in</Link></p>
      </form>
    </AuthShell>
  );
}
