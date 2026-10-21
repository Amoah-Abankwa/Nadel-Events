'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CategoryIcon, IconHeart, IconSearch } from '@/components/icons/Icons';
import { ProductImage } from '@/components/product/ProductImage';
import { api } from '@/lib/api/client';
import type { Paginated, ProductCard } from '@/lib/types';
import { useWishlistToggle } from '@/hooks/use-shop-actions';
import { AddButton, Price } from './CakeCard';
import { IconCroissant, IconCupcake, IconDonut, IconTieredCake, ScallopDisc, ScriptHeading } from './Shapes';

export interface SpotlightTab { slug: string; name: string }

const DISC = ['var(--color-rose)', '#B98F5E', '#8FB35A', '#9C7CC9', '#5BB1C9'];
const ICONS = [IconCupcake, IconDonut, IconCroissant, IconTieredCake];

/** One cake at a time per sub-category, chosen from scalloped icon tabs. */
export function LayerSpotlight({ title, tabs, initial }: { title: string; tabs: SpotlightTab[]; initial: ProductCard[] }) {
  const [tab, setTab] = useState(tabs[0]?.slug ?? '');
  const [cache, setCache] = useState<Record<string, ProductCard[]>>(() => (tabs[0] ? { [tabs[0].slug]: initial } : {}));
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!tab || cache[tab]) return;
    api.get<Paginated<ProductCard>>('/products', { params: { category: tab, limit: 10 } })
      .then((r) => setCache((c) => ({ ...c, [tab]: r.data.items })))
      .catch(() => setCache((c) => ({ ...c, [tab]: [] })));
  }, [tab, cache]);

  if (!tabs.length) return null;
  const list = cache[tab] ?? [];
  const p = list[Math.min(i, Math.max(0, list.length - 1))];
  const pick = (slug: string) => { setTab(slug); setI(0); };
  return <SpotlightBody title={title} tabs={tabs} tab={tab} pick={pick} list={list} p={p} i={i} setI={setI} loaded={Boolean(cache[tab])} />;
}

function SpotlightBody({ title, tabs, tab, pick, list, p, i, setI, loaded }: { title: string; tabs: SpotlightTab[]; tab: string; pick: (s: string) => void; list: ProductCard[]; p?: ProductCard; i: number; setI: (n: number) => void; loaded: boolean }) {
  const { saved, toggle } = useWishlistToggle(p?.id ?? '');
  const arrow = 'inline-flex size-10 items-center justify-center rounded-sm border border-rose text-rose hover:bg-blush disabled:opacity-30';

  return (
    <section aria-labelledby="layer-h" className="relative overflow-hidden bg-paper py-20">
      <ScriptHeading id="layer-h" color="text-cocoa/80">{title}</ScriptHeading>
      <div className="mx-auto mt-12 grid max-w-6xl gap-10 px-6 md:grid-cols-[11rem_1fr_1fr]">
        <div role="tablist" aria-label={`${title} types`} aria-orientation="vertical" className="flex gap-4 overflow-x-auto md:flex-col md:items-center md:border-r-2 md:border-sky md:pr-8">
          {tabs.slice(0, 5).map((t, n) => {
            const Icon = ICONS[n % ICONS.length];
            const active = t.slug === tab;
            return (
              <button key={t.slug} type="button" role="tab" aria-selected={active} aria-controls="layer-panel" onClick={() => pick(t.slug)} className="group relative shrink-0 text-center">
                <span className={`inline-block rounded-full p-1.5 transition ${active ? 'bg-[#7DCBE0]' : ''}`}>
                  <ScallopDisc size={112} fill={DISC[n % DISC.length]}>
                    {n < ICONS.length ? <Icon className="size-12 text-paper" /> : <CategoryIcon slug={t.slug} className="size-12 text-paper" />}
                  </ScallopDisc>
                </span>
                <span className={`mt-1 block text-sm ${active ? 'font-semibold text-rose' : 'text-muted'}`}>{t.name}</span>
              </button>
            );
          })}
        </div>

        <div id="layer-panel" role="tabpanel" aria-live="polite" className="flex flex-col justify-center">
          {p ? (
            <>
              <h3 className="font-sans text-3xl font-normal text-muted"><Link href={`/products/${p.slug}`} className="hover:text-rose">{p.name}</Link></h3>
              <div className="mt-3 [&_p]:justify-start"><Price p={p} large /></div>
              <dl className="mt-8 space-y-4 text-[15px]">
                <div className="grid grid-cols-[7rem_1fr]"><dt>Type:</dt><dd className="text-muted">{p.category.name}</dd></div>
                <div className="grid grid-cols-[7rem_1fr]"><dt>Collection:</dt><dd className="text-muted">{p.pickupOnly ? 'Pickup only' : 'Pickup or delivery'}</dd></div>
              </dl>
              <div className="mt-8 flex flex-col items-start gap-3">
                <AddButton p={p} />
                <button type="button" className="btn bg-rose text-paper hover:bg-rose-deep" aria-pressed={saved} onClick={toggle}>
                  <IconHeart className={`size-4 ${saved ? 'fill-current' : ''}`} /> {saved ? 'In your wish list' : 'Add to wish list'}
                </button>
              </div>
              <div className="mt-8 flex justify-between border-t border-flour pt-6">
                <button type="button" className={arrow} onClick={() => setI(i - 1)} disabled={i <= 0} aria-label="Previous cake"><svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 6-6 6 6 6" /></svg></button>
                <span className="self-center text-sm text-muted">{i + 1} of {list.length}</span>
                <button type="button" className={arrow} onClick={() => setI(i + 1)} disabled={i >= list.length - 1} aria-label="Next cake"><svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 6 6 6-6 6" /></svg></button>
              </div>
            </>
          ) : (
            <p className="text-muted">{loaded ? 'New cakes are coming soon.' : 'Loading…'}</p>
          )}
        </div>

        {p && (
          <div className="relative mx-auto aspect-square w-full max-w-md">
            <Link href={`/products/${p.slug}`} tabIndex={-1} aria-hidden className="absolute inset-0"><span className="relative block size-full"><ProductImage src={p.images[0]} alt={p.name} sizes="(min-width: 768px) 30vw, 90vw" /></span></Link>
            <Link href={`/products/${p.slug}`} aria-label={`View ${p.name}`} className="absolute bottom-6 left-1/2 inline-flex size-12 -translate-x-1/2 items-center justify-center rounded-full bg-rose text-paper shadow-md hover:bg-rose-deep"><IconSearch className="size-5" /></Link>
          </div>
        )}
      </div>
    </section>
  );
}
