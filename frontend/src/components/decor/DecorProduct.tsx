'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Description, Specification } from '@/components/product/detail/ProductTabs';
import { Reviews } from '@/components/product/Reviews';
import { ProductImage } from '@/components/product/ProductImage';
import { formatMoney } from '@/lib/format';
import type { ProductCard, ProductDetail, SpecRow } from '@/lib/types';
import { useAddToCart, useWishlistToggle } from '@/hooks/use-shop-actions';
import { Stars } from '@/components/product/Stars';

/** Photo with the outlined SALE tag and clickable thumbnails. */
export function DecorGallery({ product }: { product: ProductDetail }) {
  const [i, setI] = useState(0);
  const sale = product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price);
  const imgs = product.images.length ? product.images : [''];
  return (
    <div>
      <div className="relative aspect-square bg-petal">
        <ProductImage src={imgs[i] || undefined} alt={product.name} sizes="(min-width: 1024px) 26rem, 90vw" priority />
        {sale && <span className="absolute left-1/2 top-5 -translate-x-1/2 border border-charcoal bg-paper px-5 py-1 font-condensed text-sm uppercase">Sale!</span>}
      </div>
      {product.images.length > 1 && (
        <ul className="mt-3 grid grid-cols-4 gap-2" aria-label="More photos">
          {product.images.slice(0, 8).map((src, n) => (
            <li key={src}>
              <button type="button" onClick={() => setI(n)} aria-label={`Show photo ${n + 1}`} aria-current={n === i} className={`relative block aspect-square w-full border ${n === i ? 'border-charcoal' : 'border-transparent hover:border-petal-deep'}`}>
                <ProductImage src={src} alt="" sizes="6rem" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Stars, italic price, short text, options, quantity + outlined ADD TO CART, categories and brand. */
export function DecorBuy({ product, intro }: { product: ProductDetail; intro: string }) {
  const addToCart = useAddToCart();
  const { saved, toggle } = useWishlistToggle(product.id);
  const first = product.variants.find((v) => v.inStock) ?? product.variants[0];
  const [variantId, setVariantId] = useState(first?.id);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const v = product.variants.find((x) => x.id === variantId);
  const sale = product.compareAtPrice && Number(product.compareAtPrice) > Number(v?.price ?? product.price);
  return (
    <div>
      <a href="#decor-tabs" onClick={() => (window.location.hash = 'reviews')} className="inline-flex items-center gap-2 text-sm text-taupe">
        <Stars variant="outline" size={16} value={product.rating?.average ?? 0} />
        {product.rating && product.rating.count > 0 && <span>({product.rating.count})</span>}
      </a>
      <p className="mt-5 font-elegant text-4xl italic text-taupe">
        {sale && <s className="mr-4 text-charcoal"><span className="sr-only">Was </span>{formatMoney(product.compareAtPrice!)}</s>}
        {formatMoney(v?.price ?? product.price)}
      </p>
      {intro && <p className="mt-8 text-[17px] font-light leading-relaxed text-charcoal/80">{intro}</p>}

      {product.variants.length > 1 && (
        <div className="mt-8">
          <label htmlFor="d-opt" className="font-condensed text-sm uppercase tracking-[0.12em]">Option</label>
          <select id="d-opt" className="mt-2 h-12 w-full border border-petal-deep bg-paper px-3" value={variantId} onChange={(e) => { setVariantId(e.target.value); setQty(1); }}>
            {product.variants.map((o) => <option key={o.id} value={o.id} disabled={!o.inStock}>{o.name}: {formatMoney(o.price)}{o.inStock ? '' : ' (sold out)'}</option>)}
          </select>
        </div>
      )}

      {v?.inStock ? (
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <label htmlFor="d-qty" className="sr-only">Quantity</label>
          <input id="d-qty" type="number" min={1} max={v.maxQuantity} value={qty} onChange={(e) => setQty(Math.max(1, Math.min(v.maxQuantity, Number(e.target.value) || 1)))} className="h-12 w-16 border border-petal-deep px-3 text-taupe" />
          <button type="button"
            onClick={() => { if (addToCart(product, qty, v)) setAdded(true); }}
            className="h-12 border border-charcoal bg-paper px-8 font-condensed text-sm uppercase tracking-[0.15em] shadow-[3px_3px_0_var(--color-charcoal)] hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0_var(--color-charcoal)]">
            Add to cart
          </button>
          <button type="button" className="text-sm underline-offset-4 hover:underline" aria-pressed={saved} onClick={toggle}>
            {saved ? 'Saved to wish list' : 'Add to wish list'}
          </button>
        </div>
      ) : (
        <p className="mt-10 font-condensed uppercase tracking-widest text-danger">Sold out</p>
      )}
      {added && <p role="status" className="mt-4 text-[15px]">Added to your cart. <Link href="/cart" className="font-semibold underline">View cart</Link></p>}
      {v?.inStock && v.lowStock && <p className="mt-3 text-sm text-taupe">Only {v.maxQuantity} left.</p>}

      <dl className="mt-8 space-y-1 text-[15px]">
        <div><dt className="inline">Category: </dt><dd className="inline font-semibold"><Link href={`/decor/shop?category=${product.category.slug}`} className="hover:text-taupe">{product.category.name}</Link></dd></div>
        {product.brand && <div><dt className="inline">Brand: </dt><dd className="inline font-semibold"><Link href={`/shop?brand=${encodeURIComponent(product.brand)}`} className="hover:text-taupe">{product.brand}</Link></dd></div>}
        {v && <div><dt className="inline">Product code: </dt><dd className="inline font-semibold">{v.sku}</dd></div>}
        <div><dt className="inline">Returns: </dt><dd className="inline font-semibold">{product.returnWindowDays > 0 ? `${product.returnWindowDays} working days` : 'Not returnable'}</dd></div>
      </dl>
    </div>
  );
}

type Tab = 'description' | 'info' | 'reviews';

/** DESCRIPTION / ADDITIONAL INFORMATION / REVIEWS (n): condensed caps, boxed active tab. */
export function DecorTabs({ product, specs }: { product: ProductDetail; specs: SpecRow[] }) {
  const [tab, setTab] = useState<Tab>('description');
  useEffect(() => {
    const sync = () => { if (window.location.hash === '#reviews') setTab('reviews'); };
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);
  const tabs: [Tab, string][] = [
    ['description', 'Description'],
    ...(specs.length ? ([['info', 'Additional information']] as [Tab, string][]) : []),
    ['reviews', `Reviews (${product.rating?.count ?? 0})`],
  ];
  return (
    <section id="decor-tabs" aria-label="Product information" className="mt-16 scroll-mt-6">
      <div role="tablist" className="flex flex-wrap border-b border-petal-deep">
        {tabs.map(([id, label]) => (
          <button key={id} role="tab" type="button" id={`dtab-${id}`} aria-selected={tab === id} aria-controls={`dpanel-${id}`} onClick={() => setTab(id)}
            className={`-mb-px px-4 py-4 font-condensed text-lg uppercase tracking-[0.12em] ${tab === id ? 'border border-b-paper border-petal-deep bg-paper' : 'border border-transparent hover:text-taupe'}`}>
            {label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`dpanel-${tab}`} aria-labelledby={`dtab-${tab}`}
        className="pt-8 text-charcoal/80 [&_li]:flex [&_li]:gap-3 [&_li]:before:text-taupe [&_li]:before:content-['›'] [&_p]:font-light [&_ul]:list-none [&_ul]:pl-0">
        {tab === 'description' && <Description text={product.description} />}
        {tab === 'info' && <div className="[&_th]:text-charcoal [&_th[colspan]]:font-condensed [&_th[colspan]]:uppercase [&_th[colspan]]:tracking-widest [&_th[colspan]]:text-taupe"><Specification rows={specs} /></div>}
        {tab === 'reviews' && <Reviews slug={product.slug} productName={product.name} embedded />}
      </div>
    </section>
  );
}

/** Small round-photo product row for "Popular products". */
export function PopularRow({ p }: { p: ProductCard }) {
  const sale = p.compareAtPrice && Number(p.compareAtPrice) > Number(p.price);
  return (
    <li className="flex items-center gap-4">
      <Link href={`/decor/products/${p.slug}`} tabIndex={-1} aria-hidden className="relative size-14 shrink-0 overflow-hidden rounded-full bg-petal"><ProductImage src={p.images[0]} alt="" sizes="56px" /></Link>
      <div>
        <Link href={`/decor/products/${p.slug}`} className="font-condensed text-sm uppercase tracking-wide hover:text-taupe">{p.name}</Link>
        <div className="mt-0.5 text-taupe"><Stars variant="outline" size={12} value={p.rating?.average ?? 0} /></div>
        <p className="text-sm">{sale && <s className="mr-2 text-charcoal/60">{formatMoney(p.compareAtPrice!)}</s>}<strong>{formatMoney(p.price)}</strong></p>
      </div>
    </li>
  );
}
