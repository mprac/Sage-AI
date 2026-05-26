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
 * Session is kept in memory (fine for Expo Go testing — it just doesn't persist across a full
 * app restart). A dev/production build can reintroduce persistent storage.
 */

const url = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim().replace(/\/+$/, '');
const anonKey = (
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  ''
).trim();

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

export const supabase = {
  auth: {
    async signUp({ email, password }: { email: string; password: string }) {
      const { session, error } = await _post('/auth/v1/signup', { email, password });
      if (session) {
        _session = session;
        _emit('SIGNED_IN');
      }
      return { data: { session, user: session?.user ?? null }, error };
    },

    async signInWithPassword({ email, password }: { email: string; password: string }) {
      const { session, error } = await _post('/auth/v1/token?grant_type=password', {
        email,
        password,
      });
      if (session) {
        _session = session;
        _emit('SIGNED_IN');
      }
      return { data: { session, user: session?.user ?? null }, error };
    },

    async signOut() {
      const token = _session?.access_token;
      _session = null;
      _emit('SIGNED_OUT');
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

/** Current access token (Supabase JWT) for Authorization headers, or null if signed out. */
export async function getAccessToken(): Promise<string | null> {
  return _session?.access_token ?? null;
}
