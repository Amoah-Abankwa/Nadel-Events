'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ProductImage } from '@/components/product/ProductImage';
import { formatMoney } from '@/lib/format';
import { GHANA_REGIONS } from '@/lib/ghana';
import { useCartEstimate, useCartOnOpen } from '@/hooks/use-cart-data';
import { toLines, useCart } from '@/stores/cart-store';
import { CartNotices } from '@/components/cart/CartNotices';
import { ScriptTitle } from './PageBanner';

const pinkBtn = 'btn w-full bg-rose text-paper hover:bg-rose-deep';

export function CakeCartView() {
  const { items, setQuantity, remove, note, setNote, deliveryRegion, deliveryArea, setDeliveryEstimate } = useCart();
  const { hydrated, zones } = useCartOnOpen();
  const [noteOpen, setNoteOpen] = useState(false);
  const [estOpen, setEstOpen] = useState(false);
  const [region, setRegion] = useState('');
  const [area, setArea] = useState('');
  const lines = useMemo(() => toLines(items), [items]);
  const subtotal = items.reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0);
  // Here the estimate is only for delivery (coupons are applied at checkout in the cake design).
  const { estimate } = useCartEstimate({ lines, region: deliveryRegion, area: deliveryArea, enabled: hydrated && Boolean(deliveryRegion) });

  useEffect(() => {
    if (!hydrated) return;
    const s = useCart.getState();
    setRegion(s.deliveryRegion);
    setArea(s.deliveryArea);
    setNoteOpen(Boolean(s.note));
  }, [hydrated]);

  if (!hydrated) return null;
  if (!items.length) {
    return (
      <div className="py-10 text-center">
        <ScriptTitle>Your cart is empty</ScriptTitle>
        <p className="mt-3 text-muted">Find something sweet to fill it.</p>
        <Link href="/cakes/shop" className="btn mt-6 bg-rose text-paper hover:bg-rose-deep">Continue shopping</Link>
      </div>
    );
  }

  const step = 'inline-flex h-9 w-9 items-center justify-center text-rose hover:bg-blush disabled:opacity-30';

  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_22rem]">
      <section aria-labelledby="cart-products-h">
        <ScriptTitle id="cart-products-h">Products</ScriptTitle>
        <div className="mt-5"><CartNotices /></div>
        <ul className="space-y-5">
          {items.map((i) => (
            <li key={i.variantId} className="relative grid gap-6 border border-flour p-5 sm:grid-cols-[12rem_1fr]">
              <button type="button" onClick={() => remove(i.variantId)} aria-label={`Remove ${i.name}`} className="absolute -left-px -top-px inline-flex size-7 items-center justify-center rounded-sm bg-rose text-paper hover:bg-rose-deep">
                <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M6 6l12 12M18 6 6 18" /></svg>
              </button>
              <Link href={i.slug ? `/products/${i.slug}` : '#'} tabIndex={-1} aria-hidden className="relative block aspect-square"><ProductImage src={i.image ?? undefined} alt={i.name} sizes="12rem" /></Link>
              <div className="space-y-3">
                <h3 className="font-script text-3xl font-normal text-charcoal" style={{ color: undefined }}><Link href={i.slug ? `/products/${i.slug}` : '#'} className="hover:text-rose">{i.name}</Link></h3>
                {i.variantName && i.variantName !== 'Standard' && <p className="text-[15px]">{i.variantName}</p>}
                {i.pickupOnly && <p className="text-sm text-rose">Pickup only</p>}
                <p className="font-semibold">{formatMoney(i.unitPrice)}</p>
                <div className="inline-flex items-center border border-flour" role="group" aria-label={`Quantity of ${i.name}`}>
                  <button type="button" className={step} onClick={() => setQuantity(i.variantId, i.quantity - 1)} disabled={i.quantity <= 1} aria-label="Decrease quantity">−</button>
                  <span className="w-10 border-x border-flour text-center leading-9" aria-live="polite">{i.quantity}</span>
                  <button type="button" className={step} onClick={() => setQuantity(i.variantId, i.quantity + 1)} disabled={i.quantity >= i.maxQuantity} aria-label="Increase quantity">+</button>
                </div>
                <p className="font-semibold">Total: {formatMoney(Number(i.unitPrice) * i.quantity)}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-8"><Link href="/cakes/shop" className="btn bg-rose text-paper hover:bg-rose-deep">Continue shopping</Link></div>
      </section>

      <aside aria-labelledby="summary-h" className="space-y-4">
        <ScriptTitle id="summary-h">Order summary</ScriptTitle>
        <p className="font-semibold text-rose">Subtotal: {formatMoney(subtotal)}</p>
        {estimate && estimate.fulfilmentType === 'DELIVERY' && (
          <p className="text-sm">Delivery to {estimate.deliveryZone}: <strong>{estimate.freeDeliveryApplied ? 'Free' : formatMoney(estimate.deliveryFee)}</strong>{estimate.deliveryLeadTime ? `, usually ${estimate.deliveryLeadTime.toLowerCase()}` : ''}.</p>
        )}

        <button type="button" className="btn bg-rose text-paper hover:bg-rose-deep" aria-expanded={noteOpen} aria-controls="order-note" onClick={() => setNoteOpen(!noteOpen)}>
          {note ? 'Edit your order note' : 'Add a note to your order'}
        </button>
        {noteOpen && (
          <div id="order-note">
            <label htmlFor="note-t" className="sr-only">Order note</label>
            <textarea id="note-t" className="min-h-28 w-full border border-flour p-3 text-sm" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Message on the cake, collection time, allergies…" />
            <p className="text-xs text-muted">Saved automatically and added to your order at checkout.</p>
          </div>
        )}

        <p className="text-[15px] italic">Delivery, tax and discounts are worked out at checkout.</p>
        <Link href="/cakes/checkout" className={pinkBtn}>Proceed to checkout</Link>

        <button type="button" className={`${pinkBtn} gap-2`} aria-expanded={estOpen} aria-controls="est-form" onClick={() => setEstOpen(!estOpen)}>
          Get delivery estimate <svg aria-hidden viewBox="0 0 24 24" className={`size-4 transition-transform ${estOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
        </button>
        {estOpen && (
          <form id="est-form" className="space-y-3 border border-flour p-4" onSubmit={(e) => { e.preventDefault(); setDeliveryEstimate(region, area); }}>
            <label htmlFor="cr" className="block text-sm">Region</label>
            <select id="cr" className="h-11 w-full border border-flour px-3" value={region} onChange={(e) => { setRegion(e.target.value); setArea(''); }}>
              <option value="">Please select</option>
              {GHANA_REGIONS.map((r) => <option key={r} value={r} disabled={zones.length > 0 && !zones.some((z) => z.region === r)}>{r}</option>)}
            </select>
            <label htmlFor="ca" className="block text-sm">Town or area (optional)</label>
            <input id="ca" className="h-11 w-full border border-flour px-3" list="ca-list" value={area} onChange={(e) => setArea(e.target.value)} />
            <datalist id="ca-list">{zones.filter((z) => z.region === region).flatMap((z) => z.areas).map((a) => <option key={a} value={a} />)}</datalist>
            <button type="submit" className={pinkBtn} disabled={!region}>Calculate</button>
            {estimate?.deliveryError && <p role="alert" className="text-sm text-danger">{estimate.deliveryError}</p>}
            {items.some((i) => i.pickupOnly) && <p className="text-xs text-muted">Some items are pickup only, so delivery may not be offered for this cart.</p>}
          </form>
        )}
      </aside>
    </div>
  );
}
