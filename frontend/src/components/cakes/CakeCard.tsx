'use client';

import Link from 'next/link';
import { useState } from 'react';
import { IconHeart, IconSearch } from '@/components/icons/Icons';
import { ProductImage } from '@/components/product/ProductImage';
import { formatMoney } from '@/lib/format';
import type { ProductCard } from '@/lib/types';
import { useAddToCart, useWishlistToggle } from '@/hooks/use-shop-actions';

const savePct = (p: ProductCard) => (p.compareAtPrice && Number(p.compareAtPrice) > Number(p.price) ? Math.round((1 - Number(p.price) / Number(p.compareAtPrice)) * 100) : 0);

export function Badges({ p }: { p: ProductCard }) {
  const pct = savePct(p);
  return (
    <>
      {!p.inStock ? (
        <span className="absolute left-3 top-3 z-10 rounded-md bg-rose px-1.5 py-1 text-center text-[10px] font-bold uppercase leading-tight text-paper">Sold<br />out</span>
      ) : pct > 0 ? (
        <span className="absolute left-3 top-3 z-10 rounded-md bg-rose px-2 py-1.5 text-[10px] font-bold text-paper">Sale</span>
      ) : null}
      {pct > 0 && <span className="absolute right-3 top-3 z-10 rounded-md bg-rose px-2.5 py-1.5 text-sm text-paper">Save <strong>{pct}%</strong></span>}
    </>
  );
}

/** Round, see-through buttons over the photo: save and quick view. */
export function HoverButtons({ p }: { p: ProductCard }) {
  const { saved, toggle } = useWishlistToggle(p.id);
  const cls = 'inline-flex size-11 items-center justify-center rounded-full bg-rose/75 text-paper ring-2 ring-paper/60 hover:bg-rose';
  return (
    <div className="absolute inset-x-0 bottom-4 z-10 flex justify-center gap-3 transition [@media(hover:hover)]:translate-y-2 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:translate-y-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:translate-y-0 [@media(hover:hover)]:group-focus-within:opacity-100">
      <button type="button" className={cls} aria-pressed={saved} aria-label={saved ? `Remove ${p.name} from wish list` : `Add ${p.name} to wish list`} onClick={toggle}>
        <IconHeart className={`size-4 ${saved ? 'fill-current' : ''}`} />
      </button>
      <Link href={`/products/${p.slug}`} className={cls} aria-label={`View ${p.name}`}><IconSearch className="size-4" /></Link>
    </div>
  );
}

export function AddButton({ p, className = '' }: { p: ProductCard; className?: string }) {
  const addToCart = useAddToCart();
  const [added, setAdded] = useState(false);
  if (!p.inStock) return null;
  if (!p.defaultVariantId) return <Link href={`/products/${p.slug}`} className={`btn bg-rose text-paper hover:bg-rose-deep ${className}`}>Choose options</Link>;
  return (
    <button type="button" className={`btn bg-rose text-paper hover:bg-rose-deep ${className}`}
      onClick={() => { if (addToCart(p)) { setAdded(true); setTimeout(() => setAdded(false), 1600); } }}>
      <span aria-live="polite">{added ? 'Added' : 'Add to cart'}</span>
    </button>
  );
}

export function Price({ p, large = false }: { p: ProductCard; large?: boolean }) {
  return (
    <p className="flex items-baseline justify-center gap-2">
      <span className={`font-bold text-rose ${large ? 'text-4xl' : 'text-xl'}`}>{p.hasPriceRange && <span className="text-sm font-normal">From </span>}{formatMoney(p.price)}</span>
      {savePct(p) > 0 && <s className="text-sm text-muted"><span className="sr-only">Was </span>{formatMoney(p.compareAtPrice!)}</s>}
    </p>
  );
}

/** White card: photo, name, rose price, rose "Add to cart". `framed` adds the thick light border and grey name band. */
export function CakeCard({ p, tall = false, framed = false, outlined = false }: { p: ProductCard; tall?: boolean; framed?: boolean; outlined?: boolean }) {
  return (
    <article className={`group flex h-full flex-col bg-paper text-center ${framed ? 'border-[5px] border-flour' : outlined ? 'border border-flour' : 'shadow-[0_1px_6px_var(--color-panel-shadow)]'}`}>
      <div className={`relative ${tall ? 'aspect-[5/4]' : 'aspect-square'} overflow-hidden`}>
        <Badges p={p} />
        <Link href={`/products/${p.slug}`} tabIndex={-1} aria-hidden className="absolute inset-0 p-4">
          <span className="relative block size-full"><ProductImage src={p.images[0]} alt={p.name} sizes={tall ? '(min-width: 768px) 45vw, 100vw' : '(min-width: 1024px) 22vw, 50vw'} /></span>
        </Link>
        <HoverButtons p={p} />
      </div>
      <h3 className={`px-4 py-4 font-sans text-lg font-normal text-muted ${framed ? 'bg-cream' : ''}`}>
        <Link href={`/products/${p.slug}`} className="hover:text-rose">{p.name}</Link>
      </h3>
      <div className="mt-auto px-4 pb-8 pt-2">
        <Price p={p} />
        <AddButton p={p} className="mt-4" />
      </div>
    </article>
  );
}
