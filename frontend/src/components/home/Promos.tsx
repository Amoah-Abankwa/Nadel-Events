import Link from 'next/link';
import { BannerLink } from '@/components/marketing/BannerLink';
import type { PublicBanner } from '@/lib/api/marketing';
import { cloudinaryUrl } from '@/lib/cloudinary';

export interface PromoCard {
  tag: string;
  title: string;
  text: string;
  href: string;
}

const shadow = 'shadow-[0_1px_6px_var(--color-panel-shadow)]';

function BannerImage({ b, aspect }: { b: PublicBanner; aspect: string }) {
  return (
    <BannerLink id={b.id} href={b.destinationUrl} className={`relative block overflow-hidden bg-paper ${shadow}`}>
      <picture>
        {b.mobileImage && <source media="(max-width: 640px)" srcSet={cloudinaryUrl(b.mobileImage, 1000)} />}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cloudinaryUrl(b.desktopImage, 1400)} alt={b.altText} loading="lazy" className={`w-full object-cover ${aspect}`} />
      </picture>
      {b.isSponsored && <span className="absolute right-2 top-2 rounded-sm bg-paper/95 px-2 py-0.5 text-xs font-semibold">Sponsored</span>}
    </BannerLink>
  );
}

function TextCard({ c, className = '' }: { c: PromoCard; className?: string }) {
  return (
    <Link href={c.href} className={`group flex flex-col justify-center bg-paper p-7 ${shadow} ${className}`}>
      <span className="font-display text-3xl text-cocoa">{c.title}</span>
      <span className="mt-3 self-start bg-caramel px-3 py-1 text-sm font-bold uppercase tracking-wide text-charcoal">{c.tag}</span>
      <span className="mt-3 text-[15px] text-muted">{c.text}</span>
      <span className="mt-4 text-sm font-semibold text-burgundy underline-offset-4 group-hover:underline">Shop now</span>
    </Link>
  );
}

/** Two side-by-side promos under the hero (banners "home.promo", else text cards). */
export function PromoPair({ banners, fallback }: { banners: PublicBanner[]; fallback: PromoCard[] }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {banners.length ? banners.slice(0, 2).map((b) => <BannerImage key={b.id} b={b} aspect="aspect-[17/10]" />) : fallback.slice(0, 2).map((c) => <TextCard key={c.href} c={c} />)}
    </div>
  );
}

/** Full-width mid-page banner ("home.feature"), else a caramel band. */
export function WideBanner({ banner, fallback }: { banner?: PublicBanner; fallback: PromoCard }) {
  if (banner) return <BannerImage b={banner} aspect="aspect-[3/1] sm:aspect-[18/5]" />;
  return (
    <Link href={fallback.href} className={`group flex flex-col items-center justify-center gap-2 bg-caramel px-6 py-12 text-center ${shadow}`}>
      <span className="font-display text-3xl text-charcoal sm:text-4xl">{fallback.title}</span>
      <span className="text-lg font-semibold uppercase tracking-wide text-charcoal/85">{fallback.text}</span>
      <span className="mt-2 rounded-sm bg-burgundy px-5 py-2 text-sm font-semibold text-paper group-hover:bg-burgundy-deep">{fallback.tag}</span>
    </Link>
  );
}

/** Tall sidebar promo ("home.sidebar"), else a caramel card. */
export function SidebarPromo({ banner, fallback }: { banner?: PublicBanner; fallback: PromoCard }) {
  if (banner) return <BannerImage b={banner} aspect="aspect-[3/4]" />;
  return (
    <Link href={fallback.href} className={`group block bg-caramel px-6 py-10 text-center ${shadow}`}>
      <span className="block font-sans text-3xl font-black uppercase tracking-wide text-charcoal">{fallback.title}</span>
      <span className="mt-2 block text-sm font-semibold uppercase tracking-[0.2em] text-charcoal/85">{fallback.text}</span>
      <span className="mt-5 inline-block rounded-sm bg-burgundy px-4 py-2 text-sm font-semibold text-paper group-hover:bg-burgundy-deep">{fallback.tag}</span>
    </Link>
  );
}
