import 'server-only';
import { ApiError } from './errors';

const BASE = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

/** Server Component reads of public catalogue data, cached and revalidated. */
export async function serverGet<T>(path: string, revalidate = 60): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { next: { revalidate }, headers: { Accept: 'application/json' } });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { code?: string; message?: string };
    throw new ApiError(res.status, body.code ?? 'ERROR', body.message ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export function query(params: Record<string, string | number | boolean | undefined | null>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
  const s = q.toString();
  return s ? `?${s}` : '';
}
