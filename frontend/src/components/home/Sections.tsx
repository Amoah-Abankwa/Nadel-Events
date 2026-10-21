import Link from 'next/link';
import { IconReturn, IconSparkle, IconStore, IconTruck, IconWallet } from '@/components/icons/Icons';
import type { ProductCard } from '@/lib/types';
import { Panel } from './Panel';
import { CompactProduct } from './SidebarProducts';

/** "Specials": compact 3-across list of discounted items. */
export function Specials({ products }: { products: ProductCard[] }) {
  if (!products.length) return null;
  return (
    <Panel id="specials" title="Specials" actions={<Link href="/specials" className="text-sm font-semibold text-burgundy hover:underline">See all offers</Link>}>
      <ul className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => <CompactProduct key={p.id} p={p} />)}
      </ul>
    </Panel>
  );
}

export interface StoryCard {
  key: string;
  image: string | null;
  title: string;
  meta: string;
  text: string;
  href: string;
  cta: string;
}

/** Cards with image, title, date line, excerpt and button (the reference's "Latest blog"). */
export function Stories({ title, cards }: { title: string; cards: StoryCard[] }) {
  if (!cards.length) return null;
  return (
    <Panel id="stories" title={title}>
      <ul className="grid gap-6 sm:grid-cols-2">
        {cards.slice(0, 2).map((c) => (
          <li key={c.key}>
            <article>
              <div className="aspect-[16/9] overflow-hidden bg-flour">
                {c.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.image} alt="" loading="lazy" className="size-full object-cover" />
                ) : (
                  <div className="flex size-full items-end bg-cocoa p-5"><span className="font-display text-2xl text-cream/80">{c.title}</span></div>
                )}
              </div>
              <h3 className="mt-4 font-sans text-[15px] font-semibold uppercase tracking-wide text-charcoal">{c.title}</h3>
              <p className="mt-1 text-xs uppercase tracking-wide text-muted">{c.meta}</p>
              <p className="mt-2 line-clamp-2 text-sm text-muted">{c.text}</p>
              <Link href={c.href} className="btn btn-primary mt-4 h-10 min-h-0">{c.cta}<span className="sr-only">: {c.title}</span></Link>
            </article>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/** Replaces the reference's brand-logo strip with reasons to buy. */
export function TrustStrip({ returnsDays }: { returnsDays: number | null }) {
  const items = [
    { icon: IconTruck, title: 'Nationwide delivery', text: 'All 16 regions' },
    { icon: IconStore, title: 'Free pickup', text: 'Collect from our shop' },
    { icon: IconWallet, title: 'Pay your way', text: 'Mobile Money or card' },
    { icon: IconReturn, title: 'Easy returns', text: returnsDays ? `Up to ${returnsDays} working days` : 'On most items' },
    { icon: IconSparkle, title: 'Custom orders', text: 'Cakes and events' },
  ];
  return (
    <section aria-label="Why shop with us" className="bg-paper px-4 py-6 shadow-[0_1px_6px_var(--color-panel-shadow)]">
      <ul className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
        {items.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex items-center gap-3">
            <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full border border-crust text-burgundy"><Icon className="size-6" /></span>
            <span><span className="block text-sm font-semibold">{title}</span><span className="block text-xs text-muted">{text}</span></span>
          </li>
        ))}
      </ul>
    </section>
  );
}
