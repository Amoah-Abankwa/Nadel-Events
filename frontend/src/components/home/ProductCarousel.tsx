'use client';

import { ProductCard } from '@/components/product/ProductCard';
import type { ProductCard as Card } from '@/lib/types';
import { ArrowButtons, Panel } from './Panel';
import { useScroller } from './useScroller';

/** Titled product row with prev/next arrows (4 across on desktop, swipe on phones). */
export function ProductCarousel({ id, title, products }: { id: string; title: string; products: Card[] }) {
  const s = useScroller<HTMLUListElement>([products.length]);
  if (!products.length) return null;
  return (
    <Panel id={id} title={title} actions={<ArrowButtons label={title.toLowerCase()} onPrev={s.prev} onNext={s.next} prevDisabled={s.atStart} nextDisabled={s.atEnd} />}>
      <ProductRow products={products} scrollerRef={s.ref} />
    </Panel>
  );
}

export function ProductRow({ products, scrollerRef }: { products: Card[]; scrollerRef: React.Ref<HTMLUListElement> }) {
  return (
    <ul ref={scrollerRef} className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {products.map((p) => (
        <li key={p.id} className="w-[calc(50%-0.5rem)] shrink-0 snap-start sm:w-[calc(33.333%-0.67rem)] lg:w-[calc(25%-0.75rem)]">
          <ProductCard product={p} />
        </li>
      ))}
    </ul>
  );
}
