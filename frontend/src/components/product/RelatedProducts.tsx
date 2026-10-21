'use client';

import { useEffect, useState } from 'react';
import { ArrowButtons } from '@/components/home/Panel';
import { useScroller } from '@/components/home/useScroller';
import { checkoutApi } from '@/lib/api/checkout';
import type { ProductCard as Card } from '@/lib/types';
import { ProductCard } from './ProductCard';

/**
 * "Related products" carousel for product, cart, wish list and order pages (not the landing page).
 * Pass `products` when the server already has them, or `basedOn` product ids to fetch suggestions.
 */
export function RelatedProducts({ products: given, basedOn = [], title = 'Related products', exclude = [] }: { products?: Card[]; basedOn?: string[]; title?: string; exclude?: string[] }) {
  const [fetched, setFetched] = useState<Card[] | null>(null);
  const key = basedOn.join(',');
  useEffect(() => {
    if (given) return;
    checkoutApi.recommendations(basedOn, 10).then(setFetched).catch(() => setFetched([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [given, key]);

  const skip = new Set(exclude);
  const products = (given ?? fetched ?? []).filter((p) => !skip.has(p.id));
  const s = useScroller<HTMLUListElement>([products.length]);
  if (!products.length) return null;

  return (
    <section aria-labelledby="related-h" className="mt-8 bg-paper shadow-[0_1px_6px_var(--color-panel-shadow)]">
      <div className="mx-5 flex items-center justify-between border-b border-flour py-4">
        <h2 id="related-h" className="font-sans text-lg font-bold uppercase tracking-wide text-charcoal">{title}</h2>
        <ArrowButtons label="related products" onPrev={s.prev} onNext={s.next} prevDisabled={s.atStart} nextDisabled={s.atEnd} />
      </div>
      <ul ref={s.ref} className="flex snap-x snap-mandatory gap-4 overflow-x-auto p-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {products.map((p) => (
          <li key={p.id} className="w-[calc(50%-0.5rem)] shrink-0 snap-start sm:w-[calc(33.333%-0.67rem)] lg:w-[calc(25%-0.75rem)]">
            <ProductCard product={p} centered />
          </li>
        ))}
      </ul>
    </section>
  );
}
