'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { RelatedProducts } from '@/components/product/RelatedProducts';
import { ProductImage } from '@/components/product/ProductImage';
import { EmptyNotice } from '@/components/store/EmptyNotice';
import { Skeleton } from '@/components/support/Skeleton';
import { siteConfig } from '@/lib/config';
import { formatMoney } from '@/lib/format';
import { GHANA_REGIONS } from '@/lib/ghana';
import { useCartEstimate, useCartOnOpen } from '@/hooks/use-cart-data';
import { toLines, useCart } from '@/stores/cart-store';
import { CartNotices } from './CartNotices';
import { QuantityStepper } from './QuantityStepper';

const cell = 'border border-flour px-3 py-3 align-top';

export function CartView() {
  const { items, setQuantity, remove, couponCode, setCoupon, deliveryRegion, deliveryArea, setDeliveryEstimate } = useCart();
  const { hydrated, zones } = useCartOnOpen();
  const [couponInput, setCouponInput] = useState('');
  const [region, setRegion] = useState('');
  const [area, setArea] = useState('');
  const lines = useMemo(() => toLines(items), [items]);
  const { estimate, estimating } = useCartEstimate({ lines, couponCode, region: deliveryRegion, area: deliveryArea, enabled: hydrated });

  // Show what the customer entered last time.
  useEffect(() => {
    if (!hydrated) return;
    const s = useCart.getState();
    setCouponInput(s.couponCode);
    setRegion(s.deliveryRegion);
    setArea(s.deliveryArea);
  }, [hydrated]);

  if (!hydrated) return <Skeleton className="h-64" />;
  if (!items.length) {
    return (
      <>
        <h1 className="mb-4 font-sans text-2xl font-normal text-charcoal">Shopping cart</h1>
        <EmptyNotice text="Your shopping cart is empty." />
        <RelatedProducts title="You might like" />
      </>
    );
  }

  const m = (v: string | number) => formatMoney(v);
  const served = new Set(zones.map((z) => z.region));
  const towns = zones.filter((z) => z.region === region).flatMap((z) => z.areas);
  const hasPickupOnly = items.some((i) => i.pickupOnly);

  return (
    <>
      <h1 className="mb-4 font-sans text-2xl font-normal text-charcoal">
        Shopping cart <span className="text-lg text-muted">({items.reduce((n, i) => n + i.quantity, 0)} items)</span>
      </h1>
      <CartNotices />

      {/* Desktop table */}
      <table className="hidden w-full border-collapse bg-paper text-[15px] md:table">
        <thead>
          <tr className="text-left">
            <th className={`${cell} text-center`}>Image</th>
            <th className={cell}>Product</th>
            <th className={cell}>Quantity</th>
            <th className={`${cell} text-right`}>Unit price</th>
            <th className={`${cell} text-right`}>Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.variantId}>
              <td className={`${cell} w-24`}>
                <Link href={i.slug ? `/products/${i.slug}` : '#'} className="relative mx-auto block size-16 overflow-hidden" tabIndex={-1} aria-hidden>
                  <ProductImage src={i.image ?? undefined} alt={i.name} sizes="64px" />
                </Link>
              </td>
              <td className={cell}>
                <Link href={i.slug ? `/products/${i.slug}` : '#'} className="hover:text-burgundy">{i.name}</Link>
                {i.variantName && i.variantName !== 'Standard' && <span className="block text-sm text-muted">Option: {i.variantName}</span>}
                {i.pickupOnly && <span className="block text-sm text-cocoa">Pickup only</span>}
              </td>
              <td className={cell}>
                <div className="flex items-center gap-2">
                  <QuantityStepper value={i.quantity} max={i.maxQuantity} onChange={(n) => setQuantity(i.variantId, n)} label={`Quantity of ${i.name}`} />
                  <button type="button" onClick={() => remove(i.variantId)} aria-label={`Remove ${i.name}`} title="Remove"
                    className="inline-flex size-11 items-center justify-center rounded-sm bg-charcoal text-paper hover:bg-danger">
                    <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 6l12 12M18 6 6 18" /></svg>
                  </button>
                </div>
              </td>
              <td className={`${cell} text-right`}>{m(i.unitPrice)}</td>
              <td className={`${cell} text-right font-semibold`}>{m(Number(i.unitPrice) * i.quantity)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Phone cards */}
      <ul className="space-y-3 md:hidden">
        {items.map((i) => (
          <li key={i.variantId} className="flex gap-3 bg-paper p-3 shadow-[0_1px_6px_var(--color-panel-shadow)]">
            <div className="relative size-20 shrink-0 overflow-hidden border border-flour"><ProductImage src={i.image ?? undefined} alt={i.name} sizes="80px" /></div>
            <div className="min-w-0 flex-1">
              <Link href={i.slug ? `/products/${i.slug}` : '#'} className="font-semibold">{i.name}</Link>
              {i.variantName && i.variantName !== 'Standard' && <p className="text-sm text-muted">{i.variantName}</p>}
              <p className="text-sm">{m(i.unitPrice)} each</p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <QuantityStepper value={i.quantity} max={i.maxQuantity} onChange={(n) => setQuantity(i.variantId, n)} label={`Quantity of ${i.name}`} />
                <button type="button" className="text-sm text-danger underline" onClick={() => remove(i.variantId)}>Remove<span className="sr-only"> {i.name}</span></button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <h2 className="mt-8 font-sans text-2xl font-normal text-charcoal">What would you like to do next?</h2>
      <p className="mt-1 text-[15px]">Add a coupon code, or check what delivery to your area costs.</p>

      <div className="mt-3 space-y-2">
        <details className="group bg-paper ring-1 ring-flour" open={!!couponCode || undefined}>
          <summary className="flex cursor-pointer list-none items-center gap-1 px-4 py-3 text-burgundy [&::-webkit-details-marker]:hidden">
            Use coupon code <span aria-hidden className="text-xs transition-transform group-open:rotate-180">▾</span>
          </summary>
          <form className="flex flex-wrap items-center gap-3 border-t border-flour px-4 py-4" onSubmit={(e) => { e.preventDefault(); setCoupon(couponInput); }}>
            <label htmlFor="cart-coupon" className="w-32 text-sm">Enter your coupon</label>
            <div className="flex min-w-0 flex-1">
              <input id="cart-coupon" className="field rounded-r-none uppercase" placeholder="e.g. WELCOME10" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} autoComplete="off" />
              <button type="submit" className="btn btn-primary rounded-l-none">Apply coupon</button>
            </div>
            {couponCode && !estimate?.couponError && estimate?.couponCode && (
              <p className="w-full text-sm text-success">{estimate.couponCode} applied. <button type="button" className="underline" onClick={() => { setCoupon(''); setCouponInput(''); }}>Remove</button></p>
            )}
            {estimate?.couponError && <p role="alert" className="w-full text-sm text-danger">{estimate.couponError}</p>}
          </form>
        </details>

        <details className="group bg-paper ring-1 ring-flour" open={!!deliveryRegion || undefined}>
          <summary className="flex cursor-pointer list-none items-center gap-1 px-4 py-3 text-burgundy [&::-webkit-details-marker]:hidden">
            Estimate delivery and tax <span aria-hidden className="text-xs transition-transform group-open:rotate-180">▾</span>
          </summary>
          <form className="space-y-3 border-t border-flour px-4 py-4" onSubmit={(e) => { e.preventDefault(); setDeliveryEstimate(region, area); }}>
            <p className="text-sm">We deliver across Ghana. Choose your region to see the fee{hasPickupOnly ? '. Some items in your cart are pickup only' : ''}.</p>
            <div className="grid gap-2 sm:grid-cols-[8rem_1fr] sm:items-center">
              <label htmlFor="est-region" className="text-sm sm:text-right"><span aria-hidden className="text-danger">* </span>Region</label>
              <select id="est-region" className="field" value={region} onChange={(e) => { setRegion(e.target.value); setArea(''); }}>
                <option value="">Please select</option>
                {GHANA_REGIONS.map((r) => <option key={r} value={r} disabled={zones.length > 0 && !served.has(r)}>{r}</option>)}
              </select>
              <label htmlFor="est-area" className="text-sm sm:text-right">Town or area</label>
              <input id="est-area" className="field" list="est-towns" value={area} onChange={(e) => setArea(e.target.value)} placeholder="Optional" />
              <datalist id="est-towns">{towns.map((t) => <option key={t} value={t} />)}</datalist>
            </div>
            <div className="flex flex-wrap gap-3 sm:pl-[8.5rem]">
              <button type="submit" className="btn btn-primary" disabled={!region}>Get estimate</button>
              {deliveryRegion && <button type="button" className="text-sm underline" onClick={() => { setDeliveryEstimate('', ''); setRegion(''); setArea(''); }}>I’ll pick up instead</button>}
            </div>
            {estimate?.deliveryError && <p role="alert" className="text-sm text-danger">{estimate.deliveryError}</p>}
            {estimate?.fulfilmentType === 'DELIVERY' && estimate.deliveryLeadTime && <p className="text-sm">Delivery to {estimate.deliveryZone}: usually {estimate.deliveryLeadTime.toLowerCase()}.</p>}
          </form>
        </details>

        <details className="group bg-paper ring-1 ring-flour">
          <summary className="flex cursor-pointer list-none items-center gap-1 px-4 py-3 text-burgundy [&::-webkit-details-marker]:hidden">
            Pick up for free <span aria-hidden className="text-xs transition-transform group-open:rotate-180">▾</span>
          </summary>
          <div className="border-t border-flour px-4 py-4 text-sm">
            <p>{siteConfig.pickupAddress ? `Collect from ${siteConfig.pickupAddress}.` : 'Collect from our shop.'} {siteConfig.pickupHours}</p>
            <p className="mt-1 text-muted">Choose “Pick up” at checkout. Cakes are best collected on the day.</p>
          </div>
        </details>
      </div>

      <div className="mt-8 flex justify-end">
        <table aria-busy={estimating} className={`w-full max-w-sm border-collapse bg-paper text-[15px] ${estimating ? 'opacity-60' : ''}`}>
          <tbody>
            {estimate ? (
              <>
                <tr><th scope="row" className={`${cell} text-right`}>Sub-total:</th><td className={`${cell} text-right`}>{m(estimate.subtotal)}</td></tr>
                {Number(estimate.discountTotal) > 0 && <tr><th scope="row" className={`${cell} text-right`}>Coupon ({estimate.couponCode}):</th><td className={`${cell} text-right`}>−{m(estimate.discountTotal)}</td></tr>}
                <tr>
                  <th scope="row" className={`${cell} text-right`}>{estimate.fulfilmentType === 'DELIVERY' ? `Delivery (${estimate.deliveryZone}):` : 'Pickup:'}</th>
                  <td className={`${cell} text-right`}>{estimate.freeDeliveryApplied || Number(estimate.deliveryFee) === 0 ? 'Free' : m(estimate.deliveryFee)}</td>
                </tr>
                {!estimate.pricesIncludeTax && estimate.taxLines.filter((t) => Number(t.amount) > 0).map((t) => (
                  <tr key={t.name}><th scope="row" className={`${cell} text-right`}>{t.name} ({t.ratePercent}%):</th><td className={`${cell} text-right`}>{m(t.amount)}</td></tr>
                ))}
                <tr><th scope="row" className={`${cell} text-right`}>Total:</th><td className={`${cell} text-right font-semibold`}>{m(estimate.total)}</td></tr>
              </>
            ) : (
              <tr><th scope="row" className={`${cell} text-right`}>Sub-total:</th><td className={`${cell} text-right`}>{m(items.reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0))}</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {estimate?.amountToFreeDelivery && <p className="mt-2 text-right text-sm text-muted">Add {m(estimate.amountToFreeDelivery)} more for free delivery.</p>}
      <p className="mt-2 text-right text-xs text-muted">The final total is confirmed at checkout.</p>

      <div className="mt-6 flex justify-between gap-3">
        <Link href="/shop" className="btn btn-primary">Continue shopping</Link>
        <Link href="/checkout" className="btn btn-primary">Checkout</Link>
      </div>

      <RelatedProducts basedOn={[...new Set(items.map((i) => i.productId).filter(Boolean))]} exclude={items.map((i) => i.productId)} />
    </>
  );
}
