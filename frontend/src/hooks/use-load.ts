'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApiError } from '@/lib/api/errors';

/** Loads data on mount and when deps change; exposes reload and local updates. */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | undefined>();
  const [error, setError] = useState<ApiError | undefined>();
  const [loading, setLoading] = useState(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const reload = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      setData(await fnRef.current());
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, error, loading, reload, setData };
}

/** Tracks one save action: idle → saving → saved | error, with a message for an aria-live region. */
export function useSaver() {
  const [state, setState] = useState<{ status: 'idle' | 'saving' | 'saved' | 'error'; message?: string; fields?: Record<string, string> }>({ status: 'idle' });
  const run = useCallback(async <R,>(action: () => Promise<R>, savedMessage = 'Saved'): Promise<R | undefined> => {
    setState({ status: 'saving' });
    try {
      const r = await action();
      setState({ status: 'saved', message: savedMessage });
      return r;
    } catch (e) {
      const err = e as ApiError;
      setState({ status: 'error', message: err.message, fields: err.fieldErrors?.() });
      return undefined;
    }
  }, []);
  return { ...state, saving: state.status === 'saving', run, reset: () => setState({ status: 'idle' }) };
}
