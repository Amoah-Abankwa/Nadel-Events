'use client';

import Link from 'next/link';
import { useState } from 'react';
import { IconCart, IconHeart, IconOptions } from '@/components/icons/Icons';
import { useAddToCart, useWishlistToggle } from '@/hooks/use-shop-actions';
import type { ProductCard } from '@/lib/types';

const round = 'relative inline-flex size-10 items-center justify-center rounded-full shadow-sm transition-transform hover:scale-105 focus-visible:scale-105';

/** Round action buttons shown over the product image (always visible on touch screens). */
export function CardActions({ product }: { product: ProductCard }) {
  const addToCart = useAddToCart();
  const { saved, toggle } = useWishlistToggle(product.id);
  const [added, setAdded] = useState(false);

  return (
    <>
      {product.inStock && product.defaultVariantId ? (
        <button type="button" className={`${round} bg-caramel text-charcoal`} title="Add to cart"
          aria-label={added ? `${product.name} added to cart` : `Add ${product.name} to cart`}
          onClick={() => { if (addToCart(product)) { setAdded(true); setTimeout(() => setAdded(false), 1600); } }}>
          <IconCart className="size-5" />
          {added && <span aria-hidden className="absolute -top-8 whitespace-nowrap rounded-sm bg-charcoal px-2 py-1 text-xs text-paper">Added</span>}
        </button>
      ) : product.inStock ? (
        <Link href={`/products/${product.slug}`} className={`${round} bg-caramel text-charcoal`} aria-label={`Choose options for ${product.name}`} title="Choose options">
          <IconOptions className="size-5" />
        </Link>
      ) : null}
      <button type="button" className={`${round} ${saved ? 'bg-burgundy text-paper' : 'bg-paper text-burgundy'}`} aria-pressed={saved}
        aria-label={saved ? `Remove ${product.name} from saved items` : `Save ${product.name} for later`} title={saved ? 'Saved' : 'Save for later'} onClick={toggle}>
        <IconHeart className={`size-5 ${saved ? 'fill-current' : ''}`} />
      </button>
    </>
  );
}
