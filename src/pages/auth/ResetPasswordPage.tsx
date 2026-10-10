import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '@/services';
import { useToast } from '@/context/ToastContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Button, ButtonLink, EmptyState, Input, LoadingOverlay } from '@/components/ui';
import { AuthShell } from './AuthShell';

export default function ResetPasswordPage() {
  useDocumentTitle('Choose a new password');
  const [params] = useSearchParams();
  const token = params.get('token');
  const toast = useToast();
  const navigate = useNavigate();
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ pw?: string; confirm?: string }>({});
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <AuthShell title="This reset link is incomplete" intro="Request a new link and open it from your email.">
        <EmptyState title="Missing reset token" action={<ButtonLink to="/forgot-password">Request a new link</ButtonLink>} />
      </AuthShell>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const er: typeof errors = {};
    if (pw.length < 8) er.pw = 'Use at least 8 characters.';
    if (pw !== confirm) er.confirm = "The passwords don't match.";
    setErrors(er);
    if (Object.keys(er).length) return;
    setLoading(true);
    await authService.resetPassword(token, pw);
    setLoading(false);
    toast.success('Password updated. Log in with your new password.');
    navigate('/login');
  };

  return (
    <AuthShell title="Choose a new password" intro="Make it at least 8 characters.">
      <form onSubmit={submit} className="relative space-y-4" noValidate>
        <LoadingOverlay show={loading} label="Updating password" />
        <Input label="New password" type="password" required autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} error={errors.pw} />
        <Input label="Confirm new password" type="password" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={errors.confirm} />
        <Button type="submit" size="lg" loading={loading} className="w-full">Update password</Button>
      </form>
    </AuthShell>
  );
}
