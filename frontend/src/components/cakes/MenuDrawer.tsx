'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { IconChevronLeft, IconChevronRight } from '@/components/icons/Icons';
import { ProductImage } from '@/components/product/ProductImage';
import { api } from '@/lib/api/client';
import { formatMoney } from '@/lib/format';
import type { Category, Paginated, ProductCard } from '@/lib/types';

type Panel = 'root' | 'shop' | 'popular';

/**
 * Right-hand slide-out menu with drill-down panels:
 *  Shop    → each cake sub-category with a few of its cakes, plus a photo card
 *  Popular → photo tiles with name and price
 */
export function MenuDrawer({ open, onClose, cake }: { open: boolean; onClose: () => void; cake: Category | null }) {
  const [panel, setPanel] = useState<Panel>('root');
  const [groups, setGroups] = useState<{ sub: Category; items: ProductCard[] }[] | null>(null);
  const [popular, setPopular] = useState<ProductCard[] | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const subs = cake?.children ?? [];

  useEffect(() => {
    if (!open) return;
    setPanel('root');
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  useEffect(() => {
    if (panel === 'shop' && !groups) {
      Promise.all(subs.slice(0, 4).map((sub) => api.get<Paginated<ProductCard>>('/products', { params: { category: sub.slug, limit: 5 } }).then((r) => ({ sub, items: r.data.items })).catch(() => ({ sub, items: [] }))))
        .then(setGroups);
    }
    if (panel === 'popular' && !popular && cake) {
      api.get<Paginated<ProductCard>>('/products', { params: { category: cake.slug, featured: true, limit: 6 } }).then((r) => setPopular(r.data.items)).catch(() => setPopular([]));
    }
  }, [panel, groups, popular, subs, cake]);

  if (!open) return null;
  const row = 'flex w-full items-center justify-between border-b border-flour px-4 py-3 text-left text-[15px] hover:text-rose';
  const link = (href: string, label: string) => <Link href={href} onClick={onClose} className={row}>{label}</Link>;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Menu">
      <button type="button" aria-label="Close menu" tabIndex={-1} onClick={onClose} className="absolute inset-0 bg-charcoal/50" />
      <div className="absolute inset-y-0 right-0 flex w-[22rem] max-w-[90vw] flex-col bg-paper text-charcoal shadow-2xl">
        <div className="flex items-center justify-between border-b border-flour px-3 py-2">
          {panel !== 'root' ? (
            <button type="button" onClick={() => setPanel('root')} aria-label="Back" className="inline-flex size-10 items-center justify-center"><IconChevronLeft /></button>
          ) : <span />}
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close menu" className="inline-flex size-10 items-center justify-center">
            <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {panel === 'root' && (
            <nav aria-label="Cake shop">
              {link('/cakes', 'Home')}
              <button type="button" className={row} onClick={() => setPanel('shop')}>Shop <IconChevronRight className="size-4" /></button>
              <button type="button" className={row} onClick={() => setPanel('popular')}>Popular cakes <IconChevronRight className="size-4" /></button>
              {link('/cakes#flavours', 'Flavours')}
              {link('/services/request?service=custom-cake', 'Custom cakes')}
              {link('/cakes/contact', 'Contact')}
              {link('/', 'Main shop: decoration and kitchenware')}
            </nav>
          )}

          {panel === 'shop' && (
            <div>
              <p className="bg-cream px-4 py-3 font-semibold">Shop</p>
              <div className="space-y-6 p-4">
                <Link href="/cakes/shop" onClick={onClose} className="block text-sm font-semibold text-rose underline">All cakes</Link>
                {!groups && <p className="text-sm text-muted">Loading…</p>}
                {groups?.map(({ sub, items }) => (
                  <section key={sub.id} aria-labelledby={`dg-${sub.id}`}>
                    <h3 id={`dg-${sub.id}`} className="border-b border-flour pb-2 font-sans text-[15px] font-semibold text-charcoal">
                      <Link href={`/cakes/shop?category=${sub.slug}`} onClick={onClose} className="hover:text-rose">{sub.name}</Link>
                    </h3>
                    <ul className="mt-2 space-y-1.5 text-sm">
                      {items.map((p) => <li key={p.id}><Link href={`/products/${p.slug}`} onClick={onClose} className="hover:text-rose">{p.name}</Link></li>)}
                      {items.length === 0 && <li className="text-muted">Coming soon</li>}
                    </ul>
                  </section>
                ))}
                {groups && groups.length === 0 && <p className="text-sm text-muted">Add sub-categories (e.g. Cupcakes, Wedding cakes) to your cake category to list them here.</p>}
                {cake?.imageUrl && (
                  <Link href="/cakes/shop" onClick={onClose} className="relative block aspect-[4/3] overflow-hidden">
                    <ProductImage src={cake.imageUrl} alt={cake.name} sizes="20rem" />
                  </Link>
                )}
              </div>
            </div>
          )}

          {panel === 'popular' && (
            <div>
              <p className="bg-cream px-4 py-3 font-semibold">Popular cakes</p>
              <ul className="space-y-5 p-4">
                {!popular && <li className="text-sm text-muted">Loading…</li>}
                {popular?.map((p) => (
                  <li key={p.id}>
                    <Link href={`/products/${p.slug}`} onClick={onClose} className="block">
                      <span className="relative block aspect-[5/4] overflow-hidden"><ProductImage src={p.images[0]} alt={p.name} sizes="20rem" /></span>
                      <span className="flex justify-between gap-3 bg-rose px-4 py-2.5 text-sm font-semibold text-paper"><span className="truncate">{p.name}</span><span>{formatMoney(p.price)}</span></span>
                    </Link>
                  </li>
                ))}
                {popular && popular.length === 0 && <li className="text-sm text-muted">Mark cakes as “Show on the home page” in the admin to list them here.</li>}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
