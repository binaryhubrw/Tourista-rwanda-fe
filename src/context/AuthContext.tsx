import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { User, UserRole } from '@/types';
import * as authService from '@/services/authService';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (input: { name: string; email: string; password: string; role: Exclude<UserRole, 'admin'> }) => Promise<User>;
  updateUser: (user: User) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const dashboardPathFor = (role: UserRole) =>
  role === 'admin' ? '/admin' : role === 'business_owner' ? '/business-dashboard' : '/dashboard';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => authService.getStoredUser());

  const login = useCallback(async (email: string, password: string) => {
    const res = await authService.login(email, password);
    setUser(res.user);
    return res.user;
  }, []);

  const register = useCallback<AuthContextValue['register']>(async (input) => {
    const res = await authService.register(input);
    setUser(res.user);
    return res.user;
  }, []);

  const updateUser = useCallback(async (u: User) => {
    setUser(await authService.updateProfile(u));
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isAuthenticated: !!user, login, register, updateUser, logout }),
    [user, login, register, updateUser, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
