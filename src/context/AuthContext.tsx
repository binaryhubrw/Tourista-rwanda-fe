import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User, UserRole } from '@/types';
import { TOKEN_KEY } from '@/services/config';
import * as authService from '@/services/authService';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (input: { name: string; email: string; password: string; role: Exclude<UserRole, 'admin' | 'staff'>; businessName?: string; bankAccount?: string; mtnNumber?: string; airtelNumber?: string }) => Promise<User>;
  updateUser: (user: User) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const dashboardPathFor = (role: UserRole) =>
  role === 'admin' ? '/admin' : role === 'business_owner' || role === 'staff' ? '/business-dashboard' : '/dashboard';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => authService.getStoredUser());

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    authService.fetchMe().then(setUser).catch(() => setUser(null));
  }, []);

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
