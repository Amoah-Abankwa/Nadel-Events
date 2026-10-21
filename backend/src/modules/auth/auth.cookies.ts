import type { CookieOptions, Response } from 'express';

export const ACCESS_COOKIE = 'ck_at';
export const REFRESH_COOKIE = 'ck_rt';
const REFRESH_PATH = '/api/v1/auth';

export interface CookieSettings {
  secure: boolean;
  domain?: string;
  accessTtlSeconds: number;
  refreshTtlDays: number;
}

function base(s: CookieSettings): CookieOptions {
  return { httpOnly: true, secure: s.secure, sameSite: 'lax', domain: s.domain };
}

export function setAuthCookies(res: Response, s: CookieSettings, access: string, refresh: string) {
  res.cookie(ACCESS_COOKIE, access, { ...base(s), path: '/', maxAge: s.accessTtlSeconds * 1000 });
  res.cookie(REFRESH_COOKIE, refresh, { ...base(s), path: REFRESH_PATH, maxAge: s.refreshTtlDays * 86_400_000 });
}

export function clearAuthCookies(res: Response, s: CookieSettings) {
  res.clearCookie(ACCESS_COOKIE, { ...base(s), path: '/' });
  res.clearCookie(REFRESH_COOKIE, { ...base(s), path: REFRESH_PATH });
}
