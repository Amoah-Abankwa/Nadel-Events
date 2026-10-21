'use client';

import { useEffect, useState } from 'react';
import { checkoutApi, type CartEstimate } from '@/lib/api/checkout';
import type { CartLineInput, DeliveryZone } from '@/lib/types';
import { toLines, useCart } from '@/stores/cart-store';
import { useHydrated } from './use-hydrated';

/** When any cart page opens: re-check prices/stock with the server and load delivery zones. */
export function useCartOnOpen() {
  const hydrated = useHydrated();
  const applyValidation = useCart((s) => s.applyValidation);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  useEffect(() => {
    if (!hydrated) return;
    const lines = toLines(useCart.getState().items);
    if (lines.length) checkoutApi.validateCart(lines).then(applyValidation).catch(() => undefined);
    checkoutApi.deliveryZones().then(setZones).catch(() => setZones([]));
  }, [hydrated, applyValidation]);
  return { hydrated, zones };
}

/** Server-priced cart estimate (discount, delivery, tax), debounced. Same engine as checkout. */
export function useCartEstimate({ lines, couponCode, region, area, enabled = true }: { lines: CartLineInput[]; couponCode?: string; region?: string; area?: string; enabled?: boolean }) {
  const [estimate, setEstimate] = useState<CartEstimate | null>(null);
  const [estimating, setEstimating] = useState(false);
  const key = JSON.stringify([lines, couponCode, region, area, enabled]);
  useEffect(() => {
    if (!enabled || !lines.length) {
      setEstimate(null);
      return;
    }
    let cancelled = false;
    setEstimating(true);
    const t = setTimeout(() => {
      checkoutApi.estimate({ lines, couponCode: couponCode || undefined, deliveryRegion: region || undefined, deliveryArea: area || undefined })
        .then((e) => { if (!cancelled) setEstimate(e); })
        .catch(() => { if (!cancelled) setEstimate(null); })
        .finally(() => { if (!cancelled) setEstimating(false); });
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return { estimate, estimating };
}
