'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ProductImage } from '@/components/product/ProductImage';
import { formatMoney } from '@/lib/format';
import type { Category, ProductCard } from '@/lib/types';
import { useHydrated } from '@/hooks/use-hydrated';
import { useCart } from '@/stores/cart-store';
import { PopularRow } from './DecorProduct';
import { useRecentlyViewed, type Viewed } from './recently-viewed';

const Title = ({ id, children }: { id: string; children: React.ReactNode }) => (
  <h2 id={id} className="font-condensed text-lg font-normal uppercase tracking-[0.12em] text-charcoal" style={{ color: undefined }}>{children}</h2>
);
const block = 'border-t border-petal-deep pt-10';
const outlineBtn = 'block w-full border border-charcoal bg-paper py-2.5 text-center font-condensed text-xs uppercase tracking-[0.15em] shadow-[3px_3px_0_var(--color-charcoal)] hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0_var(--color-charcoal)]';

/** Shared right-hand column for the studio's shop and product pages. */
export function DecorSidebar({ categories, current, popular, priceBounds }: { categories: Category[]; current?: string; popular: ProductCard[]; priceBounds?: { min: number; max: number } }) {
  return (
    <aside className="space-y-10" aria-label="Shop">
      <form action="/decor/shop" role="search" className="flex border border-petal-deep">
        <label htmlFor="dsb-q" className="sr-only">Search products</label>
        <input id="dsb-q" name="q" type="search" placeholder="Search products…" className="h-12 min-w-0 flex-1 px-4 font-light placeholder:text-taupe" />
        <button type="submit" aria-label="Search" className="px-4 hover:text-taupe">
          <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></svg>
        </button>
      </form>

      <section aria-labelledby="sb-cat" className={block}>
        <Title id="sb-cat">Product categories</Title>
        <ul className="mt-6 divide-y divide-petal-deep text-[15px] font-semibold">
          {categories.map((c) => (
            <li key={c.id}><Link href={`/decor/shop?category=${c.slug}`} aria-current={c.slug === current ? 'page' : undefined} className={`block py-2.5 hover:text-taupe ${c.slug === current ? 'text-taupe' : ''}`}>{c.name}</Link></li>
          ))}
        </ul>
      </section>

      {priceBounds && priceBounds.max > priceBounds.min && <PriceFilter bounds={priceBounds} />}

      {popular.length > 0 && (
        <section aria-labelledby="sb-pop" className={block}>
          <Title id="sb-pop">Popular products</Title>
          <ul className="mt-6 space-y-5">{popular.map((p) => <PopularRow key={p.id} p={p} />)}</ul>
        </section>
      )}

      <section aria-labelledby="sb-cart" className={block}>
        <Title id="sb-cart">Your cart</Title>
        <div className="mt-6"><MiniCartWidget /></div>
      </section>

      <RecentlyViewed />
    </aside>
  );
}

/** Two-handle price slider with a "Filter" button. */
function PriceFilter({ bounds }: { bounds: { min: number; max: number } }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const lo = Math.floor(bounds.min);
  const hi = Math.ceil(bounds.max);
  const [min, setMin] = useState(Number(params.get('minPrice') ?? lo));
  const [max, setMax] = useState(Number(params.get('maxPrice') ?? hi));
  const pct = (v: number) => ((v - lo) / (hi - lo)) * 100;
  const apply = () => {
    const p = new URLSearchParams(params.toString());
    if (min > lo) p.set('minPrice', String(min)); else p.delete('minPrice');
    if (max < hi) p.set('maxPrice', String(max)); else p.delete('maxPrice');
    p.delete('page');
    router.push(`${pathname.startsWith('/decor/shop') ? pathname : '/decor/shop'}${p.size ? `?${p}` : ''}`);
  };
  const range = 'pointer-events-none absolute inset-x-0 top-1/2 h-0 w-full -translate-y-1/2 appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:size-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-charcoal [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-charcoal';
  return (
    <section aria-labelledby="sb-price" className="border-t border-petal-deep pt-10">
      <Title id="sb-price">Filter by price</Title>
      <div className="relative mt-6 h-4">
        <span aria-hidden className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-petal-deep" />
        <span aria-hidden className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-charcoal" style={{ left: `${pct(min)}%`, right: `${100 - pct(max)}%` }} />
        <label className="sr-only" htmlFor="pr-min">Minimum price</label>
        <input id="pr-min" type="range" min={lo} max={hi} step={1} value={min} onChange={(e) => setMin(Math.min(Number(e.target.value), max))} className={range} />
        <label className="sr-only" htmlFor="pr-max">Maximum price</label>
        <input id="pr-max" type="range" min={lo} max={hi} step={1} value={max} onChange={(e) => setMax(Math.max(Number(e.target.value), min))} className={range} />
      </div>
      <div className="mt-5 flex items-start justify-between gap-3">
        <p className="text-[15px]" aria-live="polite">Price: <strong>{formatMoney(min)} – {formatMoney(max)}</strong></p>
        <button type="button" onClick={apply} className="shrink-0 border border-charcoal bg-paper px-5 py-2 font-condensed text-xs uppercase tracking-[0.15em] shadow-[3px_3px_0_var(--color-charcoal)]">Filter</button>
      </div>
    </section>
  );
}

/** "Your cart": round photos, × remove, subtotal, outlined View cart / Checkout. */
export function MiniCartWidget() {
  const hydrated = useHydrated();
  const { items, remove } = useCart();
  if (!hydrated) return null;
  if (!items.length) return <p className="pl-5 text-[15px] font-light">No products in the cart.</p>;
  const total = items.reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0);
  return (
    <div>
      <ul className="space-y-4">
        {items.map((i) => (
          <li key={i.variantId} className="flex items-start gap-3">
            <span className="relative size-12 shrink-0 overflow-hidden rounded-full bg-petal"><ProductImage src={i.image ?? undefined} alt="" sizes="48px" /></span>
            <span className="min-w-0 flex-1">
              <span className="block font-condensed text-sm uppercase tracking-wide">{i.name}</span>
              <span className="text-sm font-semibold">{formatMoney(i.unitPrice)} × {i.quantity}</span>
            </span>
            <button type="button" onClick={() => remove(i.variantId)} aria-label={`Remove ${i.name}`} className="text-lg leading-none hover:text-danger">×</button>
          </li>
        ))}
      </ul>
      <p className="mt-5 text-[15px] font-semibold">Subtotal: {formatMoney(total)}</p>
      <div className="mt-4 space-y-3">
        <Link href="/cart" className={outlineBtn}>View cart</Link>
        <Link href="/checkout" className={outlineBtn}>Checkout</Link>
      </div>
    </div>
  );
}

function RecentlyViewed() {
  const hydrated = useHydrated();
  const items = useRecentlyViewed((s) => s.items);
  const pathname = usePathname();
  const shown = items.filter((v) => !pathname.endsWith(`/${v.slug}`)).slice(0, 3);
  if (!hydrated || !shown.length) return null;
  return (
    <section aria-labelledby="sb-recent" className="border-t border-petal-deep pt-10">
      <Title id="sb-recent">Recently viewed products</Title>
      <ul className="mt-6 space-y-5">
        {shown.map((v) => (
          <li key={v.slug} className="flex items-center gap-4">
            <Link href={`/decor/products/${v.slug}`} tabIndex={-1} aria-hidden className="relative size-14 shrink-0 overflow-hidden rounded-full bg-petal"><ProductImage src={v.image ?? undefined} alt="" sizes="56px" /></Link>
            <div>
              <Link href={`/decor/products/${v.slug}`} className="font-condensed text-sm uppercase tracking-wide hover:text-taupe">{v.name}</Link>
              <p className="text-sm">{v.compareAtPrice && Number(v.compareAtPrice) > Number(v.price) && <s className="mr-2 text-charcoal/60">{formatMoney(v.compareAtPrice)}</s>}<strong>{formatMoney(v.price)}</strong></p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Drop this on a product page to record the visit. */
export function TrackView({ v }: { v: Viewed }) {
  const add = useRecentlyViewed((s) => s.add);
  useEffect(() => { add(v); }, [add, v.slug]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
