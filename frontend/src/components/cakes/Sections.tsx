import Link from 'next/link';
import { CategoryIcon } from '@/components/icons/Icons';
import { ProductImage } from '@/components/product/ProductImage';
import { formatMoney } from '@/lib/format';
import type { ProductCard } from '@/lib/types';
import { Badges, CakeCard, HoverButtons } from './CakeCard';
import { IconCupcake, IconPartyHat, IconTieredCake, ScallopDisc, ScallopEdge, ScriptHeading, StarPattern } from './Shapes';

export interface Feature { title: string; text: string; href: string; icon: 'cupcake' | 'tiered' | 'party' }

const FEATURE_ICON = { cupcake: IconCupcake, tiered: IconTieredCake, party: IconPartyHat };

/** Rose band with three scalloped icon rings. */
export function FeatureBand({ features }: { features: Feature[] }) {
  return (
    <section aria-label="What we bake" className="relative overflow-hidden bg-rose text-paper">
      <StarPattern />
      <ul className="relative mx-auto grid max-w-6xl gap-10 px-6 py-16 sm:grid-cols-3">
        {features.map((f) => {
          const Icon = FEATURE_ICON[f.icon];
          return (
            <li key={f.title} className="text-center">
              <Link href={f.href} className="group inline-block">
                <ScallopDisc size={132} fill="var(--color-rose)" ring="var(--color-paper)" bumps={16}>
                  <Icon className="size-14 text-paper transition-transform group-hover:scale-110" />
                </ScallopDisc>
                <h2 className="mt-4 font-script text-4xl font-normal text-paper" style={{ color: 'inherit' }}>{f.title}</h2>
              </Link>
              <p className="mx-auto mt-2 max-w-xs text-[15px] text-paper/90">{f.text}</p>
            </li>
          );
        })}
      </ul>
      <ScallopEdge fill="var(--color-paper)" position="bottom" />
    </section>
  );
}

export interface Creation { slug: string; name: string; text: string; image: string | null }

/** "Most popular creations": four photo cards with script titles. */
export function Creations({ items }: { items: Creation[] }) {
  if (!items.length) return null;
  return (
    <section aria-labelledby="creations-h" className="bg-paper py-20">
      <ScriptHeading id="creations-h">Most popular creations</ScriptHeading>
      <ul className="mx-auto mt-12 grid max-w-6xl gap-8 px-6 sm:grid-cols-2 lg:grid-cols-4">
        {items.slice(0, 4).map((c) => (
          <li key={c.slug} className="text-center">
            <Link href={`/cakes/shop?category=${c.slug}`} className="group block">
              <div className="relative aspect-[3/2] overflow-hidden bg-blush">
                {c.image ? (
                  <span className="block size-full transition-transform duration-500 group-hover:scale-105"><ProductImage src={c.image} alt="" sizes="(min-width: 1024px) 22vw, 50vw" /></span>
                ) : (
                  <span className="flex size-full items-center justify-center text-rose"><CategoryIcon slug={c.slug} className="size-14" /></span>
                )}
              </div>
              <h3 className="mt-6 font-script text-4xl font-normal text-charcoal group-hover:text-rose">{c.name}</h3>
            </Link>
            <p className="mx-auto mt-2 max-w-[16rem] text-[15px] text-muted">{c.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** "Best deals": two large cards, then the rest three across. */
export function BestDeals({ products }: { products: ProductCard[] }) {
  if (!products.length) return null;
  const [a, b, ...rest] = products;
  return (
    <section aria-labelledby="deals-h" className="bg-cream py-20">
      <ScriptHeading id="deals-h" color="text-success">Best deals</ScriptHeading>
      <div className="mx-auto mt-12 max-w-6xl space-y-8 px-6">
        <ul className="grid gap-8 md:grid-cols-2">
          {[a, b].filter(Boolean).map((p) => <li key={p.id}><CakeCard p={p} tall /></li>)}
        </ul>
        {rest.length > 0 && (
          <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {rest.slice(0, 3).map((p) => <li key={p.id}><CakeCard p={p} /></li>)}
          </ul>
        )}
      </div>
    </section>
  );
}

const TILE_BG = ['bg-blush', 'bg-butter', 'bg-pistachio', 'bg-peach', 'bg-sky', 'bg-butter', 'bg-blush', 'bg-pistachio'];

/** "Popular flavours": edge-to-edge pastel tiles with round photos. */
export function FlavourTiles({ products }: { products: ProductCard[] }) {
  if (!products.length) return null;
  return (
    <section id="flavours" aria-labelledby="flavours-h" className="scroll-mt-28 bg-paper pt-20">
      <ScriptHeading id="flavours-h" color="text-[#2F7F93]">Popular flavours</ScriptHeading>
      <ul className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4">
        {products.slice(0, 8).map((p, n) => (
          <li key={p.id} className={`group relative px-6 py-12 text-center ${TILE_BG[n % TILE_BG.length]}`}>
            <Badges p={p} />
            <div className="relative mx-auto size-40 overflow-hidden rounded-full bg-paper">
              <Link href={`/products/${p.slug}`} tabIndex={-1} aria-hidden className="absolute inset-0 p-3"><span className="relative block size-full"><ProductImage src={p.images[0]} alt={p.name} sizes="160px" /></span></Link>
              <HoverButtons p={p} />
            </div>
            <h3 className="mt-6 font-sans text-xl font-normal text-muted"><Link href={`/products/${p.slug}`} className="hover:text-rose">{p.name}</Link></h3>
            <p className="mt-2 flex items-baseline justify-center gap-2">
              <span className="text-xl font-bold text-rose">{formatMoney(p.price)}</span>
              {p.compareAtPrice && Number(p.compareAtPrice) > Number(p.price) && <s className="text-sm text-muted">{formatMoney(p.compareAtPrice)}</s>}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Bordered grid of cakes ("Crazy flavour cakes" in the reference), with a link to all. */
export function CakeGrid({ title, products, allHref }: { title: string; products: ProductCard[]; allHref: string }) {
  if (!products.length) return null;
  return (
    <section aria-labelledby="grid-h" className="bg-paper py-20">
      <ScriptHeading id="grid-h" color="text-cocoa">{title}</ScriptHeading>
      <ul className="mx-auto mt-12 grid max-w-6xl grid-cols-2 gap-5 px-6 lg:grid-cols-4">
        {products.slice(0, 8).map((p) => <li key={p.id}><CakeCard p={p} framed /></li>)}
      </ul>
      <p className="mt-10 text-center"><Link href={allHref} className="btn bg-rose text-paper hover:bg-rose-deep">See all cakes</Link></p>
    </section>
  );
}

export { ScallopEdge };
