import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ApiError, api } from '../lib/api';
import type { LicenseStatus, User } from '../lib/types';

/**
 * Single source of truth for the session and the entitlement.
 *
 * The license lives here (not in a separate provider) because almost every
 * component needs to know "can this account create pins?".
 */

interface AuthContextValue {
  user: User | null;
  license: LicenseStatus | null;
  loading: boolean;
  /** true when the account may create pins (any paid plan) */
  canCreatePin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  activateLicense: (key: string) => Promise<{ message: string; alreadyActive: boolean }>;
  setLicense: (license: LicenseStatus) => void;
}

const FREE_LICENSE: LicenseStatus = {
  plan: 'free',
  planLabel: 'Free',
  active: false,
  unlimited: false,
  expiresAt: null,
  activatedAt: null,
  daysRemaining: 0,
  millisecondsRemaining: 0,
  key: null,
  dailyPins: 0,
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [license, setLicenseState] = useState<LicenseStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    try {
      const session = await api.me();
      setUser(session.user);
      setLicenseState(session.license);
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) console.warn('session bootstrap failed', error);
      setUser(null);
      setLicenseState(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const signIn = useCallback(async (email: string, password: string) => {
    const session = await api.login(email, password);
    setUser(session.user);
    setLicenseState(session.license);
  }, []);

  const signUp = useCallback(async (email: string, username: string, password: string) => {
    const session = await api.register(email, username, password);
    setUser(session.user);
    setLicenseState(session.license);
  }, []);

  const signOut = useCallback(async () => {
    await api.logout().catch(() => undefined);
    setUser(null);
    setLicenseState(null);
  }, []);

  const refresh = useCallback(async () => {
    if (!user) return;
    const [session, status] = await Promise.all([api.me(), api.license.status()]);
    setUser(session.user);
    setLicenseState(status.license);
  }, [user]);

  const activateLicense = useCallback(async (key: string) => {
    const result = await api.license.activate(key);
    setLicenseState(result.license);
    return { message: result.message, alreadyActive: result.alreadyActive };
  }, []);

  const setLicense = useCallback((next: LicenseStatus) => setLicenseState(next), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      license: license ?? (user ? FREE_LICENSE : null),
      loading,
      canCreatePin: Boolean(license?.active && license?.unlimited),
      signIn,
      signUp,
      signOut,
      refresh,
      activateLicense,
      setLicense,
    }),
    [user, license, loading, signIn, signUp, signOut, refresh, activateLicense, setLicense],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}

/** Convenience hook for the paid feature gate. */
export function useLicenseGate() {
  const { license, canCreatePin } = useAuth();
  return {
    license,
    canCreatePin,
    /** Reason shown in the upgrade modal when the gate blocks an action. */
    blockedReason: canCreatePin ? null : 'The free tier can browse the dashboard and demo data, but creating pins requires an active license.',
  };
}
