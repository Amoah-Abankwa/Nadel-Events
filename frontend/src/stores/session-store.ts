'use client';

import { create } from 'zustand';
import { authApi } from '@/lib/api/auth';
import type { User } from '@/lib/types';

type Status = 'unknown' | 'loading' | 'authenticated' | 'anonymous';

interface SessionState {
  user: User | null;
  status: Status;
  load: () => Promise<void>;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
}

/** Mirrors who is signed in. The HTTP-only cookie is the real session; this is UI state only. */
export const useSession = create<SessionState>()((set, get) => ({
  user: null,
  status: 'unknown',
  load: async () => {
    if (get().status === 'loading') return;
    set({ status: 'loading' });
    try {
      const user = await authApi.session();
      set({ user, status: 'authenticated' });
    } catch {
      set({ user: null, status: 'anonymous' });
    }
  },
  setUser: (user) => set({ user, status: user ? 'authenticated' : 'anonymous' }),
  logout: async () => {
    await authApi.logout().catch(() => undefined);
    set({ user: null, status: 'anonymous' });
  },
}));
