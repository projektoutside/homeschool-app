import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { usernameOrEmailToSupabaseEmail } from '../utils/authIdentity';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  signIn: (usernameOrEmail: string, password: string) => Promise<void>;
  signUp: (usernameOrEmail: string, password: string) => Promise<void>;
  updateUsername: (username: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  updateHomeLabel: (label: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(() => Boolean(supabase && isSupabaseConfigured));

  useEffect(() => {
    let isMounted = true;
    const client = supabase;

    if (!client || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    const initializeSession = async () => {
      try {
        const { data } = await client.auth.getSession();
        if (!isMounted) return;

        const currentSession = data.session ?? null;
        if (!currentSession) {
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }

        try {
          const { data: refreshedData } = await client.auth.refreshSession();
          if (!isMounted) return;

          const nextSession = refreshedData.session ?? currentSession;
          setSession(nextSession);
          setUser(nextSession?.user ?? null);
        } catch (error) {
          if (!isMounted) return;

          console.warn('[AuthProvider] Session refresh failed, using cached session.', error);
          setSession(currentSession);
          setUser(currentSession.user ?? null);
        }
      } catch (error) {
        if (!isMounted) return;

        console.error('[AuthProvider] Failed to initialize auth session.', error);
        setSession(null);
        setUser(null);
      }
      setLoading(false);
    };

    void initializeSession();

    const { data: authListener } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    session,
    loading,
    isConfigured: isSupabaseConfigured,
    signIn: async (usernameOrEmail: string, password: string) => {
      if (!supabase) throw new Error('Supabase is not configured.');
      const email = usernameOrEmailToSupabaseEmail(usernameOrEmail);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    signUp: async (usernameOrEmail: string, password: string) => {
      if (!supabase) throw new Error('Supabase is not configured.');
      const email = usernameOrEmailToSupabaseEmail(usernameOrEmail);
      const username = usernameOrEmail.trim();
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
    updateUsername: async (username: string) => {
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
      if (!supabase) throw new Error('Supabase is not configured.');
      if (password.length < 6) throw new Error('Password must be at least 6 characters.');
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
    },
    updateHomeLabel: async (label: string) => {
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
      if (!supabase) return;
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
  }), [loading, session, user]);

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
