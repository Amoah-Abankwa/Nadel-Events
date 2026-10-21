'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CartLineInput, ValidatedLine } from '@/lib/types';

export interface CartItem {
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  variantName: string;
  image: string | null;
  /** Display only. The server recalculates every amount at checkout. */
  unitPrice: string;
  quantity: number;
  maxQuantity: number;
  pickupOnly: boolean;
}

export interface CartNotice {
  variantId: string;
  name: string;
  kind: 'removed' | 'reduced' | 'price';
}

interface CartState {
  items: CartItem[];
  notices: CartNotice[];
  /** Entered in the cart, carried into checkout (both re-validated by the server). */
  couponCode: string;
  deliveryRegion: string;
  deliveryArea: string;
  /** Note for the order ("Add a note to your order"), prefilled into checkout. */
  note: string;
  setNote: (note: string) => void;
  /** Last add, so the header mini-cart can open briefly (not persisted). */
  lastAdded: { name: string; at: number } | null;
  setCoupon: (code: string) => void;
  setDeliveryEstimate: (region: string, area: string) => void;
  add: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
  mergeLines: (lines: CartLineInput[]) => void;
  applyValidation: (lines: ValidatedLine[]) => void;
  dismissNotices: () => void;
}

const MAX_LINE = 99;
const clamp = (n: number, max: number) => Math.max(1, Math.min(Math.floor(n), max, MAX_LINE));

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      notices: [],
      couponCode: '',
      deliveryRegion: '',
      deliveryArea: '',
      note: '',
      setNote: (note) => set({ note: note.slice(0, 500) }),
      lastAdded: null,
      setCoupon: (code) => set({ couponCode: code.trim().toUpperCase() }),
      setDeliveryEstimate: (deliveryRegion, deliveryArea) => set({ deliveryRegion, deliveryArea }),

      add: (item, quantity = 1) =>
        set((s) => {
          const existing = s.items.find((i) => i.variantId === item.variantId);
          if (existing) {
            return {
              items: s.items.map((i) =>
                i.variantId === item.variantId ? { ...i, ...item, quantity: clamp(i.quantity + quantity, item.maxQuantity) } : i,
              ),
              lastAdded: { name: item.name, at: Date.now() },
            };
          }
          return { items: [...s.items, { ...item, quantity: clamp(quantity, item.maxQuantity) }], lastAdded: { name: item.name, at: Date.now() } };
        }),

      setQuantity: (variantId, quantity) =>
        set((s) => ({ items: s.items.map((i) => (i.variantId === variantId ? { ...i, quantity: clamp(quantity, i.maxQuantity) } : i)) })),

      remove: (variantId) => set((s) => ({ items: s.items.filter((i) => i.variantId !== variantId) })),

      clear: () => set({ items: [], notices: [], couponCode: '', note: '' }),

      /** Adds bare lines (e.g. from "reorder"); details are filled in by the next validation. */
      mergeLines: (lines) =>
        set((s) => {
          const items = [...s.items];
          for (const l of lines) {
            const i = items.findIndex((x) => x.variantId === l.variantId);
            if (i >= 0) items[i] = { ...items[i], quantity: clamp(items[i].quantity + l.quantity, items[i].maxQuantity) };
            else items.push({ variantId: l.variantId, productId: '', slug: '', name: 'Loading…', variantName: '', image: null, unitPrice: '0', quantity: l.quantity, maxQuantity: MAX_LINE, pickupOnly: false });
          }
          return { items };
        }),

      /** Server answer wins: drop unavailable lines, clamp quantities, refresh prices (SRS FR-006). */
      applyValidation: (lines) => {
        const byId = new Map(lines.map((l) => [l.variantId, l]));
        const notices: CartNotice[] = [];
        const items: CartItem[] = [];
        for (const item of get().items) {
          const v = byId.get(item.variantId);
          if (!v || v.status === 'UNAVAILABLE' || v.status === 'OUT_OF_STOCK') {
            notices.push({ variantId: item.variantId, name: v?.productName ?? item.name, kind: 'removed' });
            continue;
          }
          if (v.status === 'QUANTITY_REDUCED') notices.push({ variantId: item.variantId, name: v.productName!, kind: 'reduced' });
          else if (item.productId && v.unitPrice !== item.unitPrice) notices.push({ variantId: item.variantId, name: v.productName!, kind: 'price' });
          items.push({
            ...item,
            productId: v.productId!,
            slug: v.slug!,
            name: v.productName!,
            variantName: v.variantName!,
            image: v.image ?? null,
            unitPrice: v.unitPrice!,
            quantity: v.quantity,
            maxQuantity: v.maxQuantity ?? MAX_LINE,
            pickupOnly: Boolean(v.pickupOnly),
          });
        }
        set({ items, notices });
      },

      dismissNotices: () => set({ notices: [] }),
    }),
    {
      name: 'ck-cart',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ items: s.items, couponCode: s.couponCode, deliveryRegion: s.deliveryRegion, deliveryArea: s.deliveryArea, note: s.note }),
      // Bump `version` and transform here whenever CartItem changes shape.
      migrate: (persisted, version) => {
        if (version < 1) return { items: [] };
        return persisted as Pick<CartState, 'items' | 'couponCode' | 'deliveryRegion' | 'deliveryArea' | 'note'>;
      },
    },
  ),
);

export const cartCount = (items: CartItem[]) => items.reduce((n, i) => n + i.quantity, 0);
export const toLines = (items: CartItem[]): CartLineInput[] => items.map((i) => ({ variantId: i.variantId, quantity: i.quantity }));
