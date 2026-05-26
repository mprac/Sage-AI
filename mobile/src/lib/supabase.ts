/**
 * Lightweight Supabase auth client built on direct REST calls + RN's global fetch.
 *
 * Why not @supabase/supabase-js? In this Expo Go (SDK 54 / new architecture) environment the
 * supabase-js GoTrue client ignores the `storage`/`fetch` options and fails with
 * "Network request failed" / "_returnResult is not a function" / "removeItem of undefined".
 * We proved a plain `fetch` to the same auth endpoints works (health 200, token POST 400), so we
 * talk to the Supabase Auth REST API directly. Exposes the small slice of the supabase-js API
 * our app uses (`auth.signUp`, `auth.signInWithPassword`, `auth.signOut`, `auth.getSession`,
 * `auth.onAuthStateChange`) so the rest of the app is unchanged.
 *
 * Session is persisted with expo-secure-store (reliable in Expo Go, unlike AsyncStorage) and the
 * access token is auto-refreshed, so the user stays signed in across app restarts.
 */

import * as SecureStore from 'expo-secure-store';

const url = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim().replace(/\/+$/, '');
const anonKey = (
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  ''
).trim();

const SESSION_KEY = 'sage.session';

console.log(`[auth] REST client · host: ${url ? url.replace('https://', '') : 'MISSING'} · key: ${anonKey ? 'yes' : 'NO'}`);

export interface AuthUser {
  id: string;
  email?: string;
}
export interface Session {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  user: AuthUser;
}
type AuthError = { message: string };
type AuthChangeCb = (event: string, session: Session | null) => void;

let _session: Session | null = null;
const _listeners = new Set<AuthChangeCb>();

function _emit(event: string) {
  for (const cb of _listeners) cb(event, _session);
}

function _headers(): Record<string, string> {
  return { apikey: anonKey, Authorization: `Bearer ${anonKey}`, 'Content-Type': 'application/json' };
}

/** Parse a Supabase auth response into either a session, a user-only result, or an error. */
async function _parse(res: Response): Promise<{ session: Session | null; error: AuthError | null }> {
  let body: Record<string, unknown> = {};
  try {
    body = await res.json();
  } catch {
    /* empty body */
  }
  if (!res.ok) {
    const message =
      (body.error_description as string) ||
      (body.msg as string) ||
      (body.message as string) ||
      (typeof body.error === 'string' ? (body.error as string) : '') ||
      `Request failed (${res.status})`;
    return { session: null, error: { message } };
  }
  // A token/signup response with tokens → a real session.
  if (body.access_token) {
    const session: Session = {
      access_token: body.access_token as string,
      refresh_token: (body.refresh_token as string) ?? '',
      expires_at: body.expires_at as number | undefined,
      user: (body.user as AuthUser) ?? { id: (body.id as string) ?? '' },
    };
    return { session, error: null };
  }
  // Signup with email-confirmation ON returns a user but no tokens (must confirm first).
  return { session: null, error: null };
}

async function _post(path: string, payload: object) {
  try {
    const res = await fetch(`${url}${path}`, {
      method: 'POST',
      headers: _headers(),
      body: JSON.stringify(payload),
    });
    return await _parse(res);
  } catch (e) {
    return { session: null, error: { message: `Network error: ${String(e)}` } };
  }
}

async function _persist(session: Session | null) {
  try {
    if (session) await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
    else await SecureStore.deleteItemAsync(SESSION_KEY);
  } catch {
    /* secure-store unavailable — session stays in memory only */
  }
}

function _setSession(session: Session | null, event: string) {
  _session = session;
  void _persist(session);
  _emit(event);
}

/** Exchange a refresh token for a fresh session. Returns the new session or null. */
async function _refresh(refreshToken: string): Promise<Session | null> {
  const { session } = await _post('/auth/v1/token?grant_type=refresh_token', {
    refresh_token: refreshToken,
  });
  if (session) _setSession(session, 'TOKEN_REFRESHED');
  return session;
}

function _isExpired(session: Session, skewSeconds = 60): boolean {
  if (!session.expires_at) return false;
  return session.expires_at <= Math.floor(Date.now() / 1000) + skewSeconds;
}

/** Load a persisted session on app launch, refreshing it if the access token has expired. */
export async function restoreSession(): Promise<Session | null> {
  try {
    const raw = await SecureStore.getItemAsync(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as Session;
    if (_isExpired(session)) {
      if (!session.refresh_token) return null;
      const refreshed = await _refresh(session.refresh_token);
      if (!refreshed) await _persist(null);
      return refreshed;
    }
    _session = session;
    return session;
  } catch {
    return null;
  }
}

export const supabase = {
  auth: {
    async signUp({ email, password }: { email: string; password: string }) {
      const { session, error } = await _post('/auth/v1/signup', { email, password });
      if (session) _setSession(session, 'SIGNED_IN');
      return { data: { session, user: session?.user ?? null }, error };
    },

    async signInWithPassword({ email, password }: { email: string; password: string }) {
      const { session, error } = await _post('/auth/v1/token?grant_type=password', {
        email,
        password,
      });
      if (session) _setSession(session, 'SIGNED_IN');
      return { data: { session, user: session?.user ?? null }, error };
    },

    async signOut() {
      const token = _session?.access_token;
      _setSession(null, 'SIGNED_OUT');
      if (token) {
        // Best-effort server-side logout; ignore failures.
        fetch(`${url}/auth/v1/logout`, {
          method: 'POST',
          headers: { ..._headers(), Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
      return { error: null };
    },

    async getSession() {
      return { data: { session: _session }, error: null };
    },

    onAuthStateChange(cb: AuthChangeCb) {
      _listeners.add(cb);
      // Fire once with the current state, matching supabase-js behaviour.
      cb(_session ? 'SIGNED_IN' : 'SIGNED_OUT', _session);
      return { data: { subscription: { unsubscribe: () => _listeners.delete(cb) } } };
    },
  },
};

/** Current access token (Supabase JWT) for Authorization headers, or null if signed out.
 *  Refreshes first if the token is at/near expiry so backend calls stay authorized. */
export async function getAccessToken(): Promise<string | null> {
  if (_session && _isExpired(_session) && _session.refresh_token) {
    await _refresh(_session.refresh_token);
  }
  return _session?.access_token ?? null;
}
