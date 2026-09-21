'use client';

import type { Role, SessionUser } from '@remedyo/shared';
import { useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, ApiRequestError } from '@/lib/api';

interface SessionContextValue {
  user: SessionUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refresh = useCallback(async () => {
    try {
      setUser(await api.get<SessionUser>('/auth/me'));
    } catch {
      // 401 and 403 both mean "no usable session" to the UI. The distinction
      // (expired vs suspended) is surfaced at the sign-in screen instead.
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signOut = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Signing out locally matters more than the request succeeding.
    }
    setUser(null);
    router.push('/');
  }, [router]);

  const value = useMemo(
    () => ({ user, loading, refresh, signOut }),
    [user, loading, refresh, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSession must be used inside a SessionProvider');
  }
  return ctx;
}

/**
 * Client-side routing guard.
 *
 * This is convenience, not security: every rule it expresses is also enforced
 * by the API, which is what actually protects the data. Its job is to avoid
 * showing a patient a doctor's shell before the request fails.
 */
export function useRequireRole(role: Role): {
  user: SessionUser | null;
  ready: boolean;
} {
  const { user, loading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (user.role !== role) {
      router.replace(homeForRole(user.role));
    }
  }, [user, loading, role, router]);

  return { user, ready: !loading && user?.role === role };
}

export function homeForRole(role: Role): string {
  switch (role) {
    case 'PATIENT':
      return '/patient';
    case 'DOCTOR':
      return '/doctor';
    case 'ADMIN':
      return '/admin';
    default:
      return '/';
  }
}

export function isAuthError(error: unknown): error is ApiRequestError {
  return error instanceof ApiRequestError;
}
