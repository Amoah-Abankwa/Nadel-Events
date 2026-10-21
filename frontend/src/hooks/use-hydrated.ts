'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/** False during SSR and the hydration pass; true after. Use before reading persisted stores. */
export function useHydrated() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
