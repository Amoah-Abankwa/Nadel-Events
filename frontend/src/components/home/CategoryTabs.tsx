'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import type { Category, Paginated, ProductCard } from '@/lib/types';
import { ArrowButtons, Panel } from './Panel';
import { ProductRow } from './ProductCarousel';
import { useScroller } from './useScroller';

/** "Shop by category": tabs per top-level category, products loaded on demand and cached. */
export function CategoryTabs({ categories, initial }: { categories: Category[]; initial: ProductCard[] }) {
  const tabs = categories.slice(0, 5);
  const [active, setActive] = useState(tabs[0]?.slug ?? '');
  const [cache, setCache] = useState<Record<string, ProductCard[]>>(() => (tabs[0] ? { [tabs[0].slug]: initial } : {}));
  const [loading, setLoading] = useState(false);
  const products = cache[active] ?? [];
  const s = useScroller<HTMLUListElement>([active, products.length]);

  useEffect(() => {
    if (!active || cache[active]) return;
    setLoading(true);
    api.get<Paginated<ProductCard>>('/products', { params: { category: active, limit: 12 } })
      .then((r) => setCache((c) => ({ ...c, [active]: r.data.items })))
      .catch(() => setCache((c) => ({ ...c, [active]: [] })))
      .finally(() => setLoading(false));
  }, [active, cache]);

  if (!tabs.length) return null;

  return (
    <Panel
      id="shop-by-category"
      title="Shop by category"
      actions={
        <>
          <div role="tablist" aria-label="Categories" className="flex flex-wrap gap-x-5 gap-y-1">
            {tabs.map((t) => (
              <button key={t.slug} role="tab" type="button" aria-selected={t.slug === active} aria-controls="category-tab-panel" onClick={() => setActive(t.slug)}
                className={`py-1 text-[15px] ${t.slug === active ? 'text-burgundy' : 'text-charcoal hover:text-burgundy'}`}>
                {t.name}
              </button>
            ))}
          </div>
          <ArrowButtons label="products" onPrev={s.prev} onNext={s.next} prevDisabled={s.atStart} nextDisabled={s.atEnd} />
        </>
      }
    >
      <div id="category-tab-panel" role="tabpanel" aria-busy={loading} className={loading ? 'opacity-60' : ''}>
        {products.length > 0 ? (
          <ProductRow products={products} scrollerRef={s.ref} />
        ) : (
          <p className="py-10 text-center text-muted">{loading ? 'Loading…' : 'New items are coming soon.'}</p>
        )}
        <p className="mt-3 text-right text-sm">
          <Link href={`/categories/${active}`} className="font-semibold text-burgundy underline-offset-4 hover:underline">
            See all {tabs.find((t) => t.slug === active)?.name.toLowerCase()}
          </Link>
        </p>
      </div>
    </Panel>
  );
}
