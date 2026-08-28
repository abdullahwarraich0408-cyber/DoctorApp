import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  clearSession,
  getPartner,
  hydrateSession,
  isDoctorSession,
  type PartnerProfile,
} from './session';
import { partnerAuthApi } from '../api';
import { disconnectSocket } from '../socket';
import { queryClient } from '../../providers/QueryProvider';

type AuthContextValue = {
  ready: boolean;
  isAuthenticated: boolean;
  partner: PartnerProfile | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [partner, setPartner] = useState<PartnerProfile | null>(null);

  useEffect(() => {
    let cancelled = false;

    const finish = () => {
      if (cancelled) return;
      setIsAuthenticated(isDoctorSession());
      setPartner(getPartner());
      setReady(true);
    };

    const timeout = setTimeout(finish, 1200);

    hydrateSession()
      .then(() => {
        clearTimeout(timeout);
        finish();
      })
      .catch(() => {
        clearTimeout(timeout);
        finish();
      });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await partnerAuthApi.login(email.trim(), password);
    setIsAuthenticated(true);
    setPartner(data?.partner || getPartner());
  }, []);

  const logout = useCallback(async () => {
    disconnectSocket();
    await clearSession();
    queryClient.clear();
    setIsAuthenticated(false);
    setPartner(null);
  }, []);

  const value = useMemo(
    () => ({ ready, isAuthenticated, partner, login, logout }),
    [ready, isAuthenticated, partner, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
