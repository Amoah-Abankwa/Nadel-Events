'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ProductImage } from '@/components/product/ProductImage';
import { formatMoney } from '@/lib/format';
import type { ProductCard } from '@/lib/types';
import { useAddToCart } from '@/hooks/use-shop-actions';
import { Stars } from '@/components/product/Stars';

/** Photo, outlined SALE tag, stars, category, condensed name, italic price; "Add to cart" appears on hover. */
export function DecorCard({ p }: { p: ProductCard }) {
  const addToCart = useAddToCart();
  const [added, setAdded] = useState(false);
  const sale = p.compareAtPrice && Number(p.compareAtPrice) > Number(p.price);
  return (
    <article className="group text-center">
      <div className="relative aspect-square overflow-hidden bg-petal">
        <Link href={`/decor/products/${p.slug}`} tabIndex={-1} aria-hidden className="absolute inset-0">
          <span className="block size-full transition-transform duration-500 group-hover:scale-[1.03]"><ProductImage src={p.images[0]} alt={p.name} sizes="(min-width: 1024px) 30vw, 90vw" /></span>
        </Link>
        {sale && <span className="absolute left-[38%] top-5 border border-charcoal bg-paper px-5 py-1 font-condensed text-sm uppercase text-charcoal">Sale!</span>}
        {!p.inStock && <span className="absolute left-5 top-5 border border-charcoal bg-paper px-3 py-1 font-condensed text-sm uppercase text-charcoal">Sold out</span>}
      </div>
      <div className="mt-5 text-taupe"><Stars variant="outline" size={16} value={p.rating?.average ?? 0} /></div>
      <p className="mt-2 text-[15px] text-charcoal">{p.category.name}</p>
      <h3 className="mt-1 font-condensed text-lg font-normal uppercase tracking-[0.12em] text-charcoal" style={{ color: undefined }}>
        <Link href={`/decor/products/${p.slug}`} className="hover:text-taupe">{p.name}</Link>
      </h3>
      <p className="mt-1 font-elegant text-2xl italic text-taupe">
        {sale && <s className="mr-3 text-charcoal/50"><span className="sr-only">Was </span>{formatMoney(p.compareAtPrice!)}</s>}
        {p.hasPriceRange && 'From '}{formatMoney(p.price)}
      </p>
      {p.inStock && (
        <div className="mt-2 h-8 transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100">
          {p.defaultVariantId ? (
            <button type="button" className="font-condensed text-sm uppercase tracking-[0.15em] text-charcoal underline-offset-4 hover:underline"
              onClick={() => { if (addToCart(p)) { setAdded(true); setTimeout(() => setAdded(false), 1600); } }}>
              <span aria-live="polite">{added ? 'Added to cart' : 'Add to cart'}</span>
            </button>
          ) : (
            <Link href={`/decor/products/${p.slug}`} className="font-condensed text-sm uppercase tracking-[0.15em] underline-offset-4 hover:underline">Choose options</Link>
          )}
        </div>
      )}
    </article>
  );
}
