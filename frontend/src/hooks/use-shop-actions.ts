'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect } from 'react';
import { loginHref } from '@/lib/site-links';
import type { ProductCard, ProductDetail, ProductVariant } from '@/lib/types';
import { useCart } from '@/stores/cart-store';
import { useSession } from '@/stores/session-store';
import { useWishlist } from '@/stores/wishlist-store';

/**
 * One add-to-cart for every card and buy box in all three sections.
 * Cards with a single option add it directly; detail pages pass the chosen variant.
 */
export function useAddToCart() {
  const add = useCart((s) => s.add);
  return useCallback(
    (p: ProductCard | ProductDetail, qty = 1, variant?: ProductVariant) => {
      const variantId = variant?.id ?? p.defaultVariantId;
      if (!variantId) return false;
      add(
        {
          variantId,
          productId: p.id,
          slug: p.slug,
          name: p.name,
          variantName: variant?.name ?? 'Standard',
          image: p.images[0] ?? null,
          unitPrice: variant?.price ?? p.price,
          maxQuantity: variant?.maxQuantity ?? 99, // the server clamps to real stock on validation
          pickupOnly: p.pickupOnly,
        },
        qty,
      );
      return true;
    },
    [add],
  );
}

/** Wish-list state and toggle for one product. Signed-out visitors go to the shared sign-in page. */
export function useWishlistToggle(productId: string) {
  const { user } = useSession();
  const { ids, load, toggle } = useWishlist();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (user) void load(user.id);
  }, [user, load]);
  return {
    saved: ids.has(productId),
    toggle: () => (user ? void toggle(productId) : router.push(loginHref(pathname))),
  };
}

/** Send a signed-out visitor to sign in and come back here. */
export function useLoginRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  return useCallback(() => router.push(loginHref(pathname)), [router, pathname]);
}
