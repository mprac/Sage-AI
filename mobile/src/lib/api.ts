/**
 * Typed-ish fetch wrapper. Attaches the Supabase JWT and points at the FastAPI backend.
 * Streaming (SSE) requests use `expo/fetch` directly in features/chat/useChatStream.ts.
 */
import { getAccessToken } from './supabase';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:8000';

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(`API ${status}`);
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...init,
    headers: { ...(await authHeaders()), ...(init.headers ?? {}) },
  });
  const body = res.headers.get('content-type')?.includes('json') ? await res.json() : await res.text();
  if (!res.ok) throw new ApiError(res.status, body);
  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  patch: <T>(path: string, json: unknown) =>
    request<T>(path, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(json),
    }),
  post: <T>(path: string, json: unknown) =>
    request<T>(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(json),
    }),
  del: <T = void>(path: string) => request<T>(path, { method: 'DELETE' }),
  /** Upload an image (multipart) to /recognize. */
  recognize: async <T>(imageUri: string): Promise<T> => {
    const form = new FormData();
    form.append('file', {
      uri: imageUri,
      name: 'photo.jpg',
      type: 'image/jpeg',
    } as unknown as Blob);
    return request<T>('/recognize', { method: 'POST', body: form });
  },
};
