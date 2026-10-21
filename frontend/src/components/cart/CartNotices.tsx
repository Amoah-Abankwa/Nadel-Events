'use client';

import { useCart } from '@/stores/cart-store';

const TEXT = {
  removed: (n: string) => `${n} is no longer available and was removed from your cart.`,
  reduced: (n: string) => `We reduced the quantity of ${n} to what we have in stock.`,
  price: (n: string) => `The price of ${n} has changed.`,
};

export function CartNotices() {
  const { notices, dismissNotices } = useCart();
  if (!notices.length) return null;
  return (
    <div role="status" className="mb-6 rounded-md border border-crust bg-paper px-4 py-3 text-sm">
      <ul className="space-y-1">
        {notices.map((n) => <li key={`${n.variantId}-${n.kind}`}>{TEXT[n.kind](n.name)}</li>)}
      </ul>
      <button type="button" onClick={dismissNotices} className="mt-2 font-semibold underline underline-offset-2">Dismiss</button>
    </div>
  );
}
