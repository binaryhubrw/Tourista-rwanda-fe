import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth, dashboardPathFor } from '@/context/AuthContext';
import type { UserRole } from '@/types';

/** Requires a logged-in user, optionally with one of the given roles. */
export function ProtectedRoute({ roles }: { roles?: UserRole[] }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to={dashboardPathFor(user.role)} replace />;
  return <Outlet />;
}
