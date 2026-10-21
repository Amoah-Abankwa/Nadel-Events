'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { IconHeart } from '@/components/icons/Icons';
import { QuantityStepper } from '@/components/cart/QuantityStepper';
import { formatMoney } from '@/lib/format';
import { siteConfig } from '@/lib/config';
import type { ProductDetail } from '@/lib/types';
import { useAddToCart, useWishlistToggle } from '@/hooks/use-shop-actions';
import { Stars } from '../Stars';

/** Title, details table, price, options, quantity, add to cart, rating link and sharing. */
export function BuyBox({ product }: { product: ProductDetail }) {
  const addToCart = useAddToCart();
  const { saved, toggle } = useWishlistToggle(product.id);
  const first = product.variants.find((v) => v.inStock) ?? product.variants[0];
  const [variantId, setVariantId] = useState(first?.id);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const v = product.variants.find((x) => x.id === variantId);
  const base = Math.min(...product.variants.map((x) => Number(x.price)));

  const row = (label: string, value: React.ReactNode) => (
    <div className="grid grid-cols-[9rem_1fr] gap-2"><dt className="text-muted">{label}</dt><dd>{value}</dd></div>
  );
  const availability = !v || !v.inStock ? <span className="font-semibold text-danger">Out of stock</span> : v.lowStock ? <span className="font-semibold text-cocoa">Only {v.maxQuantity} left</span> : <span className="text-success">In stock</span>;
  const [url, setUrl] = useState('');
  useEffect(() => setUrl(window.location.href), []);
  const share = [
    { label: 'WhatsApp', href: `https://wa.me/?text=${encodeURIComponent(`${product.name} ${url}`)}` },
    { label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
    { label: 'X', href: `https://x.com/intent/post?url=${encodeURIComponent(url)}&text=${encodeURIComponent(product.name)}` },
  ];
  const goReviews = (write: boolean) => {
    window.location.hash = write ? 'write-review' : 'reviews';
  };

  return (
    <div>
      <h1 className="font-sans text-2xl font-normal uppercase tracking-wide text-charcoal">{product.name}</h1>

      <dl className="mt-4 space-y-1 border-y border-flour py-4 text-[15px]">
        {product.brand && row('Brand', <Link href={`/shop?brand=${encodeURIComponent(product.brand)}`} className="text-burgundy hover:underline">{product.brand}</Link>)}
        {row('Category', <Link href={`/categories/${product.category.slug}`} className="hover:text-burgundy">{product.category.name}</Link>)}
        {v && row('Product code', v.sku)}
        {row('Availability', availability)}
        {row('Returns', product.returnWindowDays > 0 ? `${product.returnWindowDays} working ${product.returnWindowDays === 1 ? 'day' : 'days'}` : 'Not returnable')}
      </dl>

      <div className="border-b border-flour py-4">
        <p className="flex items-baseline gap-3">
          <span className="text-2xl font-semibold">{formatMoney(v?.price ?? product.price)}</span>
          {product.compareAtPrice && Number(product.compareAtPrice) > Number(v?.price ?? product.price) && <s className="text-muted"><span className="sr-only">Was </span>{formatMoney(product.compareAtPrice)}</s>}
        </p>
        <p className="mt-1 text-sm text-muted">Before tax and delivery. Both are shown in the cart.</p>
      </div>

      {product.variants.length > 1 && (
        <fieldset className="border-b border-flour py-4">
          <legend className="float-left mb-2 w-full font-sans text-xl text-charcoal">Available options</legend>
          <p className="clear-both mb-2 text-sm"><span aria-hidden className="text-danger">* </span>Choose one</p>
          <div className="space-y-2">
            {product.variants.map((o) => {
              const diff = Number(o.price) - base;
              return (
                <label key={o.id} className={`flex items-center gap-3 text-[15px] ${o.inStock ? 'cursor-pointer' : 'text-muted'}`}>
                  <input type="radio" name="variant" className="size-4 accent-burgundy" checked={o.id === variantId} disabled={!o.inStock} onChange={() => { setVariantId(o.id); setQty(1); }} />
                  {o.name}{diff > 0 ? ` (+${formatMoney(diff)})` : ''}{!o.inStock ? ' (out of stock)' : ''}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      <div className="border-b border-flour py-5">
        {v?.inStock ? (
          <div className="flex flex-wrap items-center gap-3">
            <QuantityStepper value={qty} max={v.maxQuantity} onChange={setQty} label={`Quantity of ${product.name}`} />
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                if (addToCart(product, qty, v)) setAdded(product.variants.length > 1 ? `${product.name} (${v.name})` : product.name);
              }}
            >
              Add to cart
            </button>
            <button type="button" aria-pressed={saved} aria-label={saved ? 'Remove from wish list' : 'Add to wish list'} title={saved ? 'In your wish list' : 'Add to wish list'}
              className={`inline-flex size-11 items-center justify-center rounded-sm ${saved ? 'bg-burgundy text-paper' : 'bg-burgundy/90 text-paper hover:bg-burgundy'}`}
              onClick={toggle}>
              <IconHeart className={`size-5 ${saved ? 'fill-current' : ''}`} />
            </button>
          </div>
        ) : (
          <p className="font-semibold text-danger">This item is out of stock. <Link href="/contact" className="underline">Ask us when it’s back</Link>.</p>
        )}

        {added && (
          <p role="status" className="mt-4 rounded-sm border border-success/30 bg-success/10 px-4 py-3 text-[15px] text-success">
            Success: you added <Link href={`/products/${product.slug}`} className="font-semibold">{added}</Link> to your <Link href="/cart" className="font-semibold underline">shopping cart</Link>.
          </p>
        )}
        {product.pickupOnly && (
          <p className="mt-4 rounded-sm border border-crust bg-flour/60 px-4 py-3 text-[15px]">
            This item is pickup only{siteConfig.pickupAddress ? ` from ${siteConfig.pickupAddress}` : ''}, so it reaches you in perfect shape.
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-flour py-4 text-[15px]">
        <Stars value={product.rating?.average ?? 0} />
        <button type="button" className="text-burgundy hover:underline" onClick={() => goReviews(false)}>
          {product.rating?.count ?? 0} {product.rating?.count === 1 ? 'review' : 'reviews'}
        </button>
        <button type="button" className="hover:text-burgundy" onClick={() => goReviews(true)}>Write a review</button>
      </div>

      <div className="flex flex-wrap items-center gap-2 py-4 text-sm">
        <span className="mr-1 text-muted">Share:</span>
        {share.map((s) => <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="rounded-sm border border-crust bg-paper px-3 py-1.5 font-semibold hover:bg-flour">{s.label}</a>)}
        <button type="button" className="rounded-sm border border-crust bg-paper px-3 py-1.5 font-semibold hover:bg-flour"
          onClick={async () => { await navigator.clipboard?.writeText(window.location.href).catch(() => undefined); setCopied(true); setTimeout(() => setCopied(false), 1800); }}>
          <span aria-live="polite">{copied ? 'Link copied' : 'Copy link'}</span>
        </button>
      </div>
    </div>
  );
}
