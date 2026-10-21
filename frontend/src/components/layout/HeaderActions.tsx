'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ProductImage } from '@/components/product/ProductImage';
import { IconBag, IconHeart, IconUser } from '@/components/icons/Icons';
import { useHydrated } from '@/hooks/use-hydrated';
import { formatMoney } from '@/lib/format';
import { cartCount, useCart } from '@/stores/cart-store';
import { useSession } from '@/stores/session-store';
import { useWishlist } from '@/stores/wishlist-store';
import { loginHref } from '@/lib/site-links';

/** Top-bar links: saved items count and account. */
export function TopBarLinks() {
  const hydrated = useHydrated();
  const { status, load, user } = useSession();
  const { ids, load: loadWishlist } = useWishlist();

  useEffect(() => {
    if (status === 'unknown') void load();
  }, [status, load]);
  useEffect(() => {
    if (user) void loadWishlist(user.id);
  }, [user, loadWishlist]);

  const sep = <span aria-hidden className="h-3 w-px bg-cream/40" />;
  return (
    <ul className="flex items-center gap-3 sm:gap-4">
      <li>
        <Link href={user ? '/account/wishlist' : loginHref('/account/wishlist')} className="inline-flex items-center gap-1.5 hover:underline">
          <IconHeart className="size-4" /> Saved ({hydrated && user ? ids.size : 0})
        </Link>
      </li>
      <li className="hidden sm:block">{sep}</li>
      <li className="hidden sm:block"><Link href="/account/orders" className="hover:underline">Track order</Link></li>
      <li>{sep}</li>
      <li>
        <Link href={user ? (user.role === 'CUSTOMER' ? '/account/orders' : '/admin') : loginHref()} className="inline-flex items-center gap-1.5 hover:underline">
          <IconUser className="size-4" /> {user ? (user.role === 'CUSTOMER' ? 'My account' : 'Admin') : 'Sign in'}
        </Link>
      </li>
    </ul>
  );
}

/** Cart pill with a mini-cart dropdown (opens on click, and briefly after adding an item). */
export function CartPill({ cartHref = '/cart', checkoutHref = '/checkout' }: { cartHref?: string; checkoutHref?: string } = {}) {
  const hydrated = useHydrated();
  const { items, remove, lastAdded } = useCart();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const count = hydrated ? cartCount(items) : 0;
  const total = hydrated ? items.reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0) : 0;

  useEffect(() => {
    if (!lastAdded || Date.now() - lastAdded.at > 2000) return;
    setOpen(true);
    const t = setTimeout(() => setOpen(false), 4000);
    return () => clearTimeout(t);
  }, [lastAdded]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div ref={box} className="relative shrink-0">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="mini-cart"
        className="group inline-flex items-center gap-3 text-paper" aria-label={`Cart, ${count} ${count === 1 ? 'item' : 'items'}, ${formatMoney(total)}`}>
        <span className="relative inline-flex size-11 items-center justify-center rounded-full bg-caramel text-charcoal transition-transform group-hover:scale-105">
          <IconBag className="size-5" />
          {count > 0 && <span aria-hidden className="absolute -right-1 -top-1 min-w-5 rounded-full bg-paper px-1 text-center text-[11px] font-bold leading-5 text-burgundy">{count}</span>}
        </span>
        <span aria-hidden className="hidden text-sm font-semibold leading-tight sm:block">
          {count} {count === 1 ? 'item' : 'items'}
          <span className="block font-normal text-paper/80">{formatMoney(total)}</span>
        </span>
      </button>

      {open && (
        <div id="mini-cart" className="absolute right-0 top-full z-50 mt-3 w-[24rem] max-w-[calc(100vw-2rem)] bg-paper text-charcoal shadow-xl ring-1 ring-flour">
          {items.length === 0 ? (
            <p className="p-6 text-center">Your shopping cart is empty.</p>
          ) : (
            <>
              <ul className="max-h-80 divide-y divide-flour overflow-y-auto bg-cream/50">
                {items.map((i) => (
                  <li key={i.variantId} className="flex gap-3 p-3">
                    <Link href={i.slug ? `/products/${i.slug}` : '/cart'} onClick={() => setOpen(false)} className="relative size-16 shrink-0 overflow-hidden border border-flour bg-paper">
                      <ProductImage src={i.image ?? undefined} alt={i.name} sizes="64px" />
                    </Link>
                    <div className="min-w-0 flex-1 text-sm">
                      <Link href={i.slug ? `/products/${i.slug}` : '/cart'} onClick={() => setOpen(false)} className="line-clamp-2 hover:text-burgundy">{i.name}</Link>
                      {i.variantName && i.variantName !== 'Standard' && <p className="text-xs text-muted">- {i.variantName}</p>}
                    </div>
                    <span className="text-sm text-muted">× {i.quantity}</span>
                    <span className="w-20 text-right text-sm font-semibold">{formatMoney(Number(i.unitPrice) * i.quantity)}</span>
                    <button type="button" onClick={() => remove(i.variantId)} aria-label={`Remove ${i.name}`} className="self-start text-danger hover:scale-110">
                      <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 6l12 12M18 6 6 18" /></svg>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="p-4">
                <table className="w-full border border-flour text-sm">
                  <tbody>
                    <tr><th scope="row" className="border border-flour px-3 py-2 text-right">Sub-total</th><td className="border border-flour px-3 py-2 text-right">{formatMoney(total)}</td></tr>
                    <tr><th scope="row" className="border border-flour px-3 py-2 text-right font-normal text-muted">Delivery and tax</th><td className="border border-flour px-3 py-2 text-right text-muted">In the cart</td></tr>
                  </tbody>
                </table>
                <div className="mt-4 flex justify-end gap-2">
                  <Link href={cartHref} onClick={() => setOpen(false)} className="btn btn-primary h-10 min-h-0">View cart</Link>
                  <Link href={checkoutHref} onClick={() => setOpen(false)} className="btn btn-primary h-10 min-h-0">Checkout</Link>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
