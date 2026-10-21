import Link from 'next/link';
import type { ProductCard as Card } from '@/lib/types';
import { CardActions } from './CardActions';
import { PriceDisplay } from './PriceDisplay';
import { ProductImage } from './ProductImage';
import { Stars } from './Stars';

/** Store-style product tile: framed image, hover actions, name, price, rating. */
export function ProductCard({ product, priority = false, centered = false }: { product: Card; priority?: boolean; centered?: boolean }) {
  const onSale = product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price);
  return (
    <article className={`group flex h-full flex-col ${centered ? 'items-center text-center' : ''}`}>
      <div className="relative aspect-square w-full overflow-hidden rounded-sm border border-flour bg-paper">
        <Link href={`/products/${product.slug}`} tabIndex={-1} aria-hidden className="absolute inset-0">
          <span className="block size-full transition-transform duration-300 group-hover:scale-[1.03]">
            <ProductImage src={product.images[0]} alt={product.name} sizes="(min-width: 1024px) 20vw, (min-width: 640px) 30vw, 50vw" priority={priority} />
          </span>
        </Link>
        {onSale && <span className="absolute left-2 top-2 rounded-full bg-burgundy px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-paper">Sale</span>}
        {!product.inStock && <span className="absolute left-2 top-2 rounded-sm bg-paper px-2 py-0.5 text-xs font-semibold text-danger">Out of stock</span>}
        <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2 transition duration-200 [@media(hover:hover)]:translate-y-2 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:translate-y-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:translate-y-0 [@media(hover:hover)]:group-focus-within:opacity-100">
          <CardActions product={product} />
        </div>
      </div>
      <h3 className="mt-3 line-clamp-1 font-sans text-[0.95rem] font-normal text-charcoal">
        <Link href={`/products/${product.slug}`} className="hover:text-burgundy">{product.name}</Link>
      </h3>
      <PriceDisplay price={product.price} compareAt={product.compareAtPrice} from={product.hasPriceRange} className="mt-1 text-sm" />
      <div className="mt-1 min-h-5">
        {product.rating && product.rating.count > 0 ? <Stars value={product.rating.average} count={product.rating.count} /> : <span className="text-xs text-muted">{product.pickupOnly ? 'Pickup only' : product.category.name}</span>}
      </div>
    </article>
  );
}
