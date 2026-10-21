'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface Viewed { slug: string; name: string; image: string | null; price: string; compareAtPrice: string | null }

/** Last few decoration products this browser looked at (stays on the device; nothing is sent to the server). */
export const useRecentlyViewed = create<{ items: Viewed[]; add: (v: Viewed) => void }>()(
  persist(
    (set) => ({
      items: [],
      add: (v) => set((s) => ({ items: [v, ...s.items.filter((x) => x.slug !== v.slug)].slice(0, 5) })),
    }),
    { name: 'ck-decor-viewed', version: 1, storage: createJSONStorage(() => localStorage) },
  ),
);
