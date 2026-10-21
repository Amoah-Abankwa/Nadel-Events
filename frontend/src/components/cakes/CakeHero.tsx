'use client';

import Link from 'next/link';
import { useSlider } from '@/hooks/use-slider';
import { BannerLink } from '@/components/marketing/BannerLink';
import type { PublicBanner } from '@/lib/api/marketing';
import { IconCupcake, ScallopEdge } from './Shapes';
import { cloudinaryUrl } from '@/lib/cloudinary';

export interface CakeSlide {
  key: string;
  kicker: string;
  title: string;
  cta: string;
  href: string;
  bg: string;
}

/** Full-width cake slider (banners "cakes.hero", else soft text slides) with a scalloped bottom edge. */
export function CakeHero({ banners, slides }: { banners: PublicBanner[]; slides: CakeSlide[] }) {
  const count = banners.length || slides.length;
  const { index: i, go, pauseHandlers } = useSlider(count, 6500);

  const arrow = 'absolute top-1/2 z-10 hidden size-10 -translate-y-1/2 items-center justify-center rounded-sm bg-rose text-paper hover:bg-rose-deep sm:inline-flex';

  return (
    <section aria-roledescription="carousel" aria-label="Cake highlights" className="relative bg-blush"
      {...pauseHandlers}>
      <div className="overflow-hidden">
        <div className="flex transition-transform duration-700 motion-reduce:transition-none" style={{ transform: `translateX(-${i * 100}%)` }}>
          {banners.length
            ? banners.map((b, n) => (
                <div key={b.id} role="group" aria-roledescription="slide" aria-label={`${n + 1} of ${count}`} aria-hidden={n !== i} inert={n !== i} className="w-full shrink-0">
                  <BannerLink id={b.id} href={b.destinationUrl} className="block">
                    <picture>
                      {b.mobileImage && <source media="(max-width: 640px)" srcSet={cloudinaryUrl(b.mobileImage, 1200)} />}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={cloudinaryUrl(b.desktopImage, 1920)} alt={b.altText} loading={n === 0 ? 'eager' : 'lazy'} fetchPriority={n === 0 ? 'high' : undefined} className="h-[30rem] w-full object-cover sm:h-[40rem]" />
                    </picture>
                  </BannerLink>
                </div>
              ))
            : slides.map((s, n) => (
                <div key={s.key} role="group" aria-roledescription="slide" aria-label={`${n + 1} of ${count}`} aria-hidden={n !== i} inert={n !== i} className={`w-full shrink-0 ${s.bg}`}>
                  <div className="mx-auto flex h-[30rem] max-w-4xl flex-col items-center justify-center px-6 pt-20 text-center sm:h-[40rem]">
                    <IconCupcake className="size-20 text-rose" />
                    <p className="mt-3 font-script text-3xl text-cocoa/80 sm:text-4xl">{s.kicker}</p>
                    <p className="mt-1 font-script text-5xl leading-none text-rose sm:text-7xl">{s.title}</p>
                    <Link href={s.href} className="btn mt-8 bg-rose text-paper hover:bg-rose-deep">{s.cta}</Link>
                  </div>
                </div>
              ))}
        </div>
      </div>

      {count > 1 && (
        <>
          <button type="button" onClick={() => go(i - 1)} aria-label="Previous slide" className={`${arrow} left-3`}><svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 6-6 6 6 6" /></svg></button>
          <button type="button" onClick={() => go(i + 1)} aria-label="Next slide" className={`${arrow} right-3`}><svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 6 6 6-6 6" /></svg></button>
          <div className="absolute inset-x-0 bottom-10 z-10 flex justify-center gap-2">
            {Array.from({ length: count }, (_, n) => (
              <button key={n} type="button" onClick={() => go(n)} aria-label={`Show slide ${n + 1}`} aria-current={n === i} className={`size-3.5 rounded-full ${n === i ? 'bg-rose' : 'bg-paper ring-1 ring-rose/40'}`} />
            ))}
          </div>
        </>
      )}
      <div className="absolute inset-x-0 bottom-0"><ScallopEdge fill="var(--color-rose)" position="bottom" /></div>
    </section>
  );
}
