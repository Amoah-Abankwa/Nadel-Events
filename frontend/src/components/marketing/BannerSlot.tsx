import { serverGet } from '@/lib/api/server';
import type { PublicBanner } from '@/lib/api/marketing';
import { BannerLink } from './BannerLink';

/**
 * Renders the live banners for a placement, or nothing. Images are plain <img> with
 * width/height ratio boxes so any https host works and layout doesn't shift.
 */
export async function BannerSlot({ placement }: { placement: string }) {
  const banners = await serverGet<PublicBanner[]>(`/banners?placement=${placement}`, 60).catch(() => [] as PublicBanner[]);
  if (!banners.length) return null;
  const strip = placement === 'home.strip';

  return (
    <aside aria-label="Promotions" className={strip ? '' : 'grid gap-4'}>
      {banners.map((b) => (
        <BannerLink key={b.id} id={b.id} href={b.destinationUrl} className="group relative block overflow-hidden rounded-md border border-flour">
          <picture>
            {b.mobileImage && <source media="(max-width: 640px)" srcSet={b.mobileImage} />}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={b.desktopImage} alt={b.altText} loading={placement === 'home.feature' ? 'eager' : 'lazy'} className={`w-full object-cover ${strip ? 'aspect-[8/1]' : 'aspect-[3/1] sm:aspect-[4/1]'}`} />
          </picture>
          {b.isSponsored && <span className="absolute right-2 top-2 rounded-sm bg-paper/95 px-2 py-0.5 text-xs font-semibold text-charcoal">Sponsored</span>}
        </BannerLink>
      ))}
    </aside>
  );
}
