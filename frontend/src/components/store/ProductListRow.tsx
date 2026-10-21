import Link from 'next/link';
import { CardActions } from '@/components/product/CardActions';
import { PriceDisplay } from '@/components/product/PriceDisplay';
import { ProductImage } from '@/components/product/ProductImage';
import { Stars } from '@/components/product/Stars';
import type { ProductCard } from '@/lib/types';

/** List-view row: image left, details right, actions always visible. */
export function ProductListRow({ p }: { p: ProductCard }) {
  const onSale = p.compareAtPrice && Number(p.compareAtPrice) > Number(p.price);
  return (
    <article className="flex gap-5 border-b border-flour pb-5 last:border-0 last:pb-0">
      <Link href={`/products/${p.slug}`} tabIndex={-1} aria-hidden className="relative aspect-square w-32 shrink-0 overflow-hidden rounded-sm border border-flour sm:w-44">
        <ProductImage src={p.images[0]} alt={p.name} sizes="176px" />
        {onSale && <span className="absolute left-2 top-2 rounded-full bg-burgundy px-2 py-0.5 text-[11px] font-bold uppercase text-paper">Sale</span>}
      </Link>
      <div className="min-w-0 flex-1">
        <h3 className="font-sans text-lg font-normal"><Link href={`/products/${p.slug}`} className="hover:text-burgundy">{p.name}</Link></h3>
        <p className="text-sm text-muted">{p.category.name}{p.pickupOnly ? ', pickup only' : ''}{!p.inStock ? ', out of stock' : ''}</p>
        <PriceDisplay price={p.price} compareAt={p.compareAtPrice} from={p.hasPriceRange} className="mt-2" />
        {p.rating && p.rating.count > 0 && <div className="mt-1"><Stars value={p.rating.average} count={p.rating.count} /></div>}
        <div className="mt-3 flex gap-2"><CardActions product={p} /></div>
      </div>
    </article>
  );
}
