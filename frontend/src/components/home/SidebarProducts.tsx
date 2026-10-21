'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CardActions } from '@/components/product/CardActions';
import { PriceDisplay } from '@/components/product/PriceDisplay';
import { ProductImage } from '@/components/product/ProductImage';
import { Stars } from '@/components/product/Stars';
import type { ProductCard } from '@/lib/types';
import { ArrowButtons } from './Panel';

function Box({ id, title, actions, children }: { id: string; title: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="bg-paper p-5 shadow-[0_1px_6px_var(--color-panel-shadow)]">
      <div className="mb-4 flex items-center justify-between border-b border-flour pb-4">
        <h2 id={id} className="font-sans text-lg font-bold uppercase tracking-wide text-charcoal">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

/** One deal at a time with arrows ("Hot deals" in the reference). */
export function DealSpotlight({ products }: { products: ProductCard[] }) {
  const [i, setI] = useState(0);
  if (!products.length) return null;
  const p = products[i];
  const go = (d: number) => setI((i + d + products.length) % products.length);
  return (
    <Box id="deal-spotlight" title="Hot deals" actions={products.length > 1 && <ArrowButtons label="deal" onPrev={() => go(-1)} onNext={() => go(1)} />}>
      <article className="group" aria-live="polite">
        <div className="relative aspect-square overflow-hidden rounded-sm border border-flour">
          <Link href={`/products/${p.slug}`} tabIndex={-1} aria-hidden className="absolute inset-0">
            <ProductImage src={p.images[0]} alt={p.name} sizes="16rem" />
          </Link>
          <span className="absolute left-2 top-2 rounded-full bg-burgundy px-2.5 py-1 text-[11px] font-bold uppercase text-paper">Sale</span>
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2"><CardActions product={p} /></div>
        </div>
        <h3 className="mt-3 line-clamp-2 font-sans text-[0.95rem] font-normal"><Link href={`/products/${p.slug}`} className="hover:text-burgundy">{p.name}</Link></h3>
        <PriceDisplay price={p.price} compareAt={p.compareAtPrice} className="mt-1 text-sm" />
        {p.rating && p.rating.count > 0 && <div className="mt-1"><Stars value={p.rating.average} count={p.rating.count} /></div>}
      </article>
    </Box>
  );
}

/** Compact list: thumbnail, name, price, stars ("Hot deal"/"Top deal" in the reference). */
export function CompactProductList({ id, title, products }: { id: string; title: string; products: ProductCard[] }) {
  if (!products.length) return null;
  return (
    <Box id={id} title={title}>
      <ul className="space-y-4">
        {products.map((p) => <CompactProduct key={p.id} p={p} />)}
      </ul>
    </Box>
  );
}

export function CompactProduct({ p }: { p: ProductCard }) {
  return (
    <li className="flex gap-4">
      <Link href={`/products/${p.slug}`} className="relative size-[5.5rem] shrink-0 overflow-hidden rounded-sm border border-flour" tabIndex={-1} aria-hidden>
        <ProductImage src={p.images[0]} alt={p.name} sizes="88px" />
      </Link>
      <div className="min-w-0">
        <h3 className="line-clamp-1 font-sans text-[0.95rem] font-normal"><Link href={`/products/${p.slug}`} className="hover:text-burgundy">{p.name}</Link></h3>
        <PriceDisplay
          price={p.price}
          compareAt={p.compareAtPrice}
          from={p.hasPriceRange}
          className="mt-1 flex-col items-start gap-0 text-sm"
        />
        {p.rating && p.rating.count > 0 && <div className="mt-1"><Stars value={p.rating.average} /></div>}
      </div>
    </li>
  );
}
