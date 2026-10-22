import type { StudioData } from './domain';

export interface Account { id: string; name: string; email: string; image?: string }
export interface ServerStatus { googleSignIn: boolean; rendering: boolean; database: string; missing: string[]; authError?: string }
export interface RenderJob { id: string; name: string; status: string; createdAt: string; resultUrl?: string; originalUrl: string; fabricUrl: string; styleUrl: string; error?: string }
export async function api<T>(path: string, body?: unknown, method = body === undefined ? 'GET' : 'POST', headers: Record<string, string> = {}): Promise<T> {
  const response = await fetch(path, { method, credentials: 'same-origin', cache: 'no-store', headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.error || result?.message || `Request failed (${response.status}).`);
  return result as T;
}
export async function signIn() {
  const response = await api<{ url?: string; redirect?: boolean }>('/api/auth/sign-in/social', { provider: 'google', callbackURL: location.origin + '/#studio', disableRedirect: true });
  if (!response.url) throw new Error('Google sign-in did not return a redirect URL.');
  const destination = new URL(response.url);
  if (destination.protocol !== 'https:' || destination.hostname !== 'accounts.google.com') throw new Error('Unexpected sign-in destination.');
  location.assign(destination.href);
}
export const getStudio = () => api<{ data: StudioData; revision: number }>('/api/studio');
export const putStudio = (data: StudioData, revision: number) => api<{ data: StudioData; revision: number }>('/api/studio', { data, revision }, 'PUT');
export const jobLabels: Record<string, string> = { queued: 'In the queue', prepare_submit: 'Starting fabric preparation', preparing: 'Preparing your garment', tryon_submit: 'Starting your try-on', rendering: 'Trying it on', done: 'Ready to view', failed: 'Couldn’t create this look', needs_review: 'Needs a provider check' };
