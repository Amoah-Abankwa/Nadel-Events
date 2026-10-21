import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { siteConfig } from '../config';
import { toApiError } from './errors';

/** The one configured Axios instance for browser → API calls (SRS 6.2). */
export const api = axios.create({
  baseURL: siteConfig.apiUrl,
  timeout: 15_000,
  withCredentials: true, // HTTP-only session cookies
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

type RetryConfig = InternalAxiosRequestConfig & { _retried?: boolean };

let refreshing: Promise<void> | null = null;
const SKIP_REFRESH = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const cfg = error.config as RetryConfig | undefined;
    const code = (error.response?.data as { code?: string } | undefined)?.code;
    // Access cookie expired (or was dropped by the browser): try one silent refresh.
    const shouldRefresh = error.response?.status === 401 && (code === 'SESSION_EXPIRED' || code === 'UNAUTHENTICATED');

    if (cfg && shouldRefresh && !cfg._retried && !SKIP_REFRESH.some((p) => cfg.url?.startsWith(p))) {
      cfg._retried = true;
      try {
        // Single-flight: concurrent 401s share one refresh call.
        refreshing ??= api.post('/auth/refresh').then(() => undefined).finally(() => (refreshing = null));
        await refreshing;
        return api.request(cfg);
      } catch {
        /* fall through to the original error */
      }
    }
    return Promise.reject(toApiError(error));
  },
);
