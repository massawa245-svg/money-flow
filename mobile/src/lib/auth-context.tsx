import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';

import { biometricAvailable, isBiometricLockEnabled } from './biometric';
import { supabase } from './supabase';

// Nach so langer Zeit im Hintergrund muss die App wieder per Biometrie entsperrt werden
const RELOCK_AFTER_MS = 60 * 1000;

type AuthContextValue = {
  session: Session | null;
  isLoading: boolean;
  locked: boolean;
  unlock: () => void;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function lockRequired() {
  return (await isBiometricLockEnabled()) && (await biometricAvailable());
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const backgroundedAt = useRef<number | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      // Gespeicherte Session beim Kaltstart erst nach Biometrie freigeben
      if (data.session && (await lockRequired())) setLocked(true);
      setSession(data.session);
      setIsLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (!newSession) setLocked(false);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (state) => {
      if (state === 'background') {
        backgroundedAt.current = Date.now();
      } else if (state === 'active' && backgroundedAt.current !== null) {
        const away = Date.now() - backgroundedAt.current;
        backgroundedAt.current = null;
        if (session && away > RELOCK_AFTER_MS && (await lockRequired())) setLocked(true);
      }
    });
    return () => subscription.remove();
  }, [session]);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setLocked(false);
  }

  return (
    <AuthContext.Provider value={{ session, isLoading, locked, unlock: () => setLocked(false), signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useSession muss innerhalb von SessionProvider verwendet werden');
  return ctx;
}
