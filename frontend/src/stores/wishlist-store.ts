'use client';

import { create } from 'zustand';
import { accountApi } from '@/lib/api/account';

interface WishlistState {
  ids: Set<string>;
  loadedFor: string | null; // user id the list belongs to
  load: (userId: string) => Promise<void>;
  toggle: (productId: string) => Promise<boolean>;
  reset: () => void;
}

/** One shared copy of the signed-in customer's saved items (header count + heart buttons). */
export const useWishlist = create<WishlistState>()((set, get) => ({
  ids: new Set(),
  loadedFor: null,
  load: async (userId) => {
    if (get().loadedFor === userId) return;
    set({ loadedFor: userId });
    const items = await accountApi.wishlist().catch(() => []);
    set({ ids: new Set(items.map((i: { id: string }) => i.id)) });
  },
  toggle: async (productId) => {
    const saved = get().ids.has(productId);
    const next = new Set(get().ids);
    if (saved) next.delete(productId);
    else next.add(productId);
    set({ ids: next }); // optimistic
    try {
      await (saved ? accountApi.removeWish(productId) : accountApi.addWish(productId));
      return !saved;
    } catch {
      const undo = new Set(get().ids);
      if (saved) undo.add(productId);
      else undo.delete(productId);
      set({ ids: undo });
      return saved;
    }
  },
  reset: () => set({ ids: new Set(), loadedFor: null }),
}));
