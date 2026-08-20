import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import {
  AUTH_BOOT_TIMEOUT_MS,
  AUTH_REFRESH_TIMEOUT_MS,
  AuthBootTimeoutError,
  createInitialAuthState,
  getSessionAfterRefreshFailure,
  isUsableSupabaseSession,
  withAuthTimeout,
} from './authBoot';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { usernameOrEmailToSupabaseEmail } from '../utils/authIdentity';
import {
  clearGuestSession,
  isGuestUser,
  readActiveGuestUser,
  startGuestSession,
  updateGuestProfile,
} from '../utils/guestSession';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  isGuest: boolean;
  signIn: (usernameOrEmail: string, password: string) => Promise<void>;
  signUp: (usernameOrEmail: string, password: string) => Promise<void>;
  signInAsGuest: () => Promise<void>;
  updateUsername: (username: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  updateHomeLabel: (label: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [initialAuthState] = useState(() => createInitialAuthState<User>({
    remoteAuthAvailable: Boolean(supabase && isSupabaseConfigured),
    readPersistedGuest: readActiveGuestUser,
  }));
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(initialAuthState.user);
  const [loading, setLoading] = useState<boolean>(initialAuthState.loading);

  useEffect(() => {
    let isMounted = true;
    const client = supabase;

    if (!client || !isSupabaseConfigured) {
      void Promise.resolve().then(() => {
        if (!isMounted) return;

        const guestUser = readActiveGuestUser();
        if (guestUser) {
          setSession(null);
          setUser(guestUser);
        }
        setLoading(false);
      });

      return () => {
        isMounted = false;
      };
    }

    const showLocalFallback = () => {
      setSession(null);
      setUser(readActiveGuestUser());
      setLoading(false);
    };

    const applySupabaseSession = (nextSession: Session) => {
      clearGuestSession();
      setSession(nextSession);
      setUser(nextSession.user);
      setLoading(false);
    };

    const initializeSession = async () => {
      try {
        const { data } = await withAuthTimeout(
          client.auth.getSession(),
          AUTH_BOOT_TIMEOUT_MS,
          'getSession',
        );
        if (!isMounted) return;

        const currentSession = isUsableSupabaseSession(data.session) ? data.session : null;
        if (!currentSession) {
          showLocalFallback();
          return;
        }

        try {
          const { data: refreshedData } = await withAuthTimeout(
            client.auth.refreshSession(),
            AUTH_REFRESH_TIMEOUT_MS,
            'refreshSession',
          );
          if (!isMounted) return;

          const nextSession = isUsableSupabaseSession(refreshedData.session)
            ? refreshedData.session
            : currentSession;
          applySupabaseSession(nextSession);
        } catch (error) {
          if (!isMounted) return;

          const fallbackSession = getSessionAfterRefreshFailure(currentSession, error);
          if (fallbackSession) {
            console.warn('[AuthProvider] Session refresh timed out, using cached session.', error);
            applySupabaseSession(fallbackSession);
            return;
          }

          console.warn('[AuthProvider] Session refresh failed; showing login fallback.', error);
          showLocalFallback();
        }
      } catch (error) {
        if (!isMounted) return;

        if (error instanceof AuthBootTimeoutError) {
          console.warn('[AuthProvider] Failed to initialize auth session; showing login fallback.', error);
        } else {
          console.error('[AuthProvider] Failed to initialize auth session; showing login fallback.', error);
        }
        showLocalFallback();
      }
    };

    void initializeSession();

    const { data: authListener } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (isUsableSupabaseSession(nextSession)) {
        applySupabaseSession(nextSession);
        return;
      }

      showLocalFallback();
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const isGuest = isGuestUser(user);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    session,
    loading,
    isConfigured: isSupabaseConfigured,
    isGuest,
    signIn: async (usernameOrEmail: string, password: string) => {
      if (!supabase) throw new Error('Supabase is not configured.');
      const email = usernameOrEmailToSupabaseEmail(usernameOrEmail);
      clearGuestSession();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    signUp: async (usernameOrEmail: string, password: string) => {
      if (!supabase) throw new Error('Supabase is not configured.');
      const email = usernameOrEmailToSupabaseEmail(usernameOrEmail);
      const username = usernameOrEmail.trim();
      clearGuestSession();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
          },
        },
      });
      if (error) throw error;
    },
    signInAsGuest: async () => {
      const guestUser = startGuestSession();
      setSession(null);
      setUser(guestUser);
      setLoading(false);
    },
    updateUsername: async (username: string) => {
      if (isGuestUser(user)) {
        const cleaned = username.trim();
        if (!cleaned) throw new Error('Username cannot be empty.');
        setUser(updateGuestProfile({ username: cleaned }));
        return;
      }

      if (!supabase) throw new Error('Supabase is not configured.');
      const cleaned = username.trim();
      if (!cleaned) throw new Error('Username cannot be empty.');
      const { error } = await supabase.auth.updateUser({
        data: {
          ...(user?.user_metadata ?? {}),
          username: cleaned,
        },
      });
      if (error) throw error;
    },
    updatePassword: async (password: string) => {
      if (isGuestUser(user)) {
        throw new Error('Guest mode does not use a password. Create an account when you are ready to sync across devices.');
      }

      if (!supabase) throw new Error('Supabase is not configured.');
      if (password.length < 6) throw new Error('Password must be at least 6 characters.');
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
    },
    updateHomeLabel: async (label: string) => {
      if (isGuestUser(user)) {
        const cleaned = label.trim();
        if (!cleaned) throw new Error('Home label cannot be empty.');
        setUser(updateGuestProfile({ homeLabel: cleaned }));
        return;
      }

      if (!supabase) throw new Error('Supabase is not configured.');
      const cleaned = label.trim();
      if (!cleaned) throw new Error('Home label cannot be empty.');
      const { error } = await supabase.auth.updateUser({
        data: {
          ...(user?.user_metadata ?? {}),
          home_label: cleaned,
        },
      });
      if (error) throw error;
    },
    signOut: async () => {
      if (isGuestUser(user)) {
        clearGuestSession();
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      if (!supabase) return;
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
  }), [isGuest, loading, session, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
