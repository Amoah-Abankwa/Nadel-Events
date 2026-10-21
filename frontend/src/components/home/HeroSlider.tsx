'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useSlider } from '@/hooks/use-slider';
import { BannerLink } from '@/components/marketing/BannerLink';
import type { PublicBanner } from '@/lib/api/marketing';
import { cloudinaryUrl } from '@/lib/cloudinary';

export interface TextSlide {
  key: string;
  tag: string;
  title: string;
  text: string;
  cta: string;
  href: string;
  tone: 'cocoa' | 'flour' | 'burgundy';
  points: string[];
  /** Optional background photo, e.g. "/assets/hero/cakes.jpg" (a file in frontend/public). Shown at 30% opacity. */
  image?: string;
}

type Slide = { kind: 'banner'; banner: PublicBanner } | { kind: 'text'; slide: TextSlide };

const TONES = {
  cocoa: { bg: 'bg-cocoa', title: 'text-paper', text: 'text-cream/85', point: 'border-cream/20 text-cream' },
  burgundy: { bg: 'bg-burgundy', title: 'text-paper', text: 'text-cream/85', point: 'border-cream/20 text-cream' },
  flour: { bg: 'bg-flour', title: 'text-cocoa', text: 'text-charcoal/80', point: 'border-cocoa/15 text-cocoa' },
};

/**
 * Home hero. Uses admin-managed banners (placement "home.hero") when there are any; otherwise
 * text slides in brand colours. Auto-advances every 6 s, pauses on hover/focus, and never
 * auto-advances when the visitor prefers reduced motion.
 */
export function HeroSlider({ banners, fallback }: { banners: PublicBanner[]; fallback: TextSlide[] }) {
  const slides: Slide[] = banners.length ? banners.map((b) => ({ kind: 'banner', banner: b })) : fallback.map((s) => ({ kind: 'text', slide: s }));
  const { index: i, go, pauseHandlers } = useSlider(slides.length, 6000);

  if (!slides.length) return null;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Highlights"
      className="relative overflow-hidden bg-paper shadow-[0_1px_6px_var(--color-panel-shadow)]"
      {...pauseHandlers}
    >
      <div className="flex transition-transform duration-500 motion-reduce:transition-none" style={{ transform: `translateX(-${i * 100}%)` }}>
        {slides.map((s, n) => (
          <div key={s.kind === 'banner' ? s.banner.id : s.slide.key} role="group" aria-roledescription="slide" aria-label={`${n + 1} of ${slides.length}`} aria-hidden={n !== i} inert={n !== i} className="w-full shrink-0">
            {s.kind === 'banner' ? <BannerSlideView b={s.banner} eager={n === 0} /> : <TextSlideView s={s.slide} active={n === i} eager={n === 0} />}
          </div>
        ))}
      </div>

      {slides.length > 1 && (
        <>
          <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2">
            {slides.map((_, n) => (
              <button key={n} type="button" onClick={() => go(n)} aria-label={`Show slide ${n + 1}`} aria-current={n === i}
                className={`size-3 rounded-full border-2 border-paper ${n === i ? 'bg-caramel' : 'bg-charcoal/60'}`} />
            ))}
          </div>
          <button type="button" onClick={() => go(i - 1)} aria-label="Previous slide" className="absolute left-3 top-1/2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-paper/90 text-charcoal shadow sm:inline-flex">
            <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 6-6 6 6 6" /></svg>
          </button>
          <button type="button" onClick={() => go(i + 1)} aria-label="Next slide" className="absolute right-3 top-1/2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-paper/90 text-charcoal shadow sm:inline-flex">
            <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 6 6 6-6 6" /></svg>
          </button>
        </>
      )}
    </section>
  );
}

function BannerSlideView({ b, eager }: { b: PublicBanner; eager: boolean }) {
  return (
    <BannerLink id={b.id} href={b.destinationUrl} className="relative block">
      <picture>
        {b.mobileImage && <source media="(max-width: 640px)" srcSet={cloudinaryUrl(b.mobileImage, 1200)} />}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cloudinaryUrl(b.desktopImage, 1600)} alt={b.altText} loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : undefined} className="aspect-[4/3] w-full object-cover sm:aspect-[15/7]" />
      </picture>
      {b.isSponsored && <span className="absolute right-3 top-3 rounded-sm bg-paper/95 px-2 py-0.5 text-xs font-semibold">Sponsored</span>}
    </BannerLink>
  );
}

function TextSlideView({ s, active, eager }: { s: TextSlide; active: boolean; eager: boolean }) {
  const t = TONES[s.tone];
  const [failed, setFailed] = useState(false);
  return (
    <div className={`${t.bg} relative grid min-h-[22rem] items-center gap-8 overflow-hidden px-6 py-10 sm:min-h-[26rem] sm:grid-cols-[1.3fr_1fr] sm:px-12`}>
      {s.image && !failed && (
        // Decorative background: 30% opacity, fades in when the slide becomes active.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={s.image}
          alt=""
          aria-hidden
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setFailed(true)}
          className={`pointer-events-none absolute inset-0 size-full object-cover transition-opacity duration-1000 ease-out motion-reduce:transition-none ${active ? 'opacity-30' : 'opacity-0'}`}
        />
      )}
      <div className="relative">
        <p className="inline-block bg-caramel px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-charcoal">{s.tag}</p>
        <h2 className={`mt-4 text-4xl leading-[1.05] sm:text-5xl ${t.title}`}>{s.title}</h2>
        <p className={`mt-4 max-w-md text-lg ${t.text}`}>{s.text}</p>
        <Link href={s.href} className="btn mt-7 bg-caramel text-charcoal hover:bg-caramel-deep">{s.cta}</Link>
      </div>
      <ul className="relative hidden sm:block">
        {s.points.map((p) => (
          <li key={p} className={`border-b py-3 font-display text-2xl ${t.point}`}>{p}</li>
        ))}
      </ul>
    </div>
  );
}