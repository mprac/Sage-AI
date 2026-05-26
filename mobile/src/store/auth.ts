/** Auth state (Zustand), hydrated from Supabase. The session is the source of truth. */
import { create } from 'zustand';

import { supabase, type Session } from '../lib/supabase';

interface AuthState {
  session: Session | null;
  ready: boolean; // false until the initial session check completes
  setSession: (s: Session | null) => void;
}

export const useAuth = create<AuthState>((set) => ({
  session: null,
  ready: false,
  setSession: (session) => set({ session, ready: true }),
}));

/** Wire Supabase auth changes into the store. Call once at app root. */
export function initAuthListener() {
  // Always resolve `ready`, even if the session lookup fails (bad/missing env, no network) —
  // otherwise the app hangs on a blank loading screen instead of showing sign-in.
  supabase.auth
    .getSession()
    .then(({ data }) => useAuth.getState().setSession(data.session))
    .catch(() => useAuth.getState().setSession(null));

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    useAuth.getState().setSession(session);
  });
  return () => data.subscription.unsubscribe();
}
