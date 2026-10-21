import { ProductImage } from '@/components/product/ProductImage';
import { BannerLink } from '@/components/marketing/BannerLink';
import type { PublicBanner } from '@/lib/api/marketing';
import type { ProductCard } from '@/lib/types';
import { CondensedHeading, Elegant, Kicker, OutlineButton } from './Bits';
import { DecorCard } from './DecorCard';
import { cloudinaryUrl } from '@/lib/cloudinary';

function Photo({ src, alt, sizes, banner }: { src: string | null; alt: string; sizes: string; banner?: PublicBanner }) {
  if (banner) {
    return (
      <BannerLink id={banner.id} href={banner.destinationUrl} className="relative block size-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cloudinaryUrl(banner.desktopImage, 1400)} alt={banner.altText} className="size-full object-cover" />
      </BannerLink>
    );
  }
  return src ? <ProductImage src={src} alt={alt} sizes={sizes} /> : <span className="block size-full bg-petal-deep" aria-hidden />;
}

/** Photo on the left, small tagline, two-line serif headline, outlined button on the right. */
export function DecorHero({ banner, image, since, shopHref }: { banner?: PublicBanner; image: string | null; since: string; shopHref: string }) {
  return (
    <section aria-labelledby="decor-hero-h" className="relative bg-paper">
      <div className="grid lg:grid-cols-[1.35fr_1fr]">
        <div className="relative aspect-[16/10] bg-petal lg:aspect-auto lg:min-h-[28rem]"><Photo banner={banner} src={image} alt="" sizes="(min-width: 1024px) 60vw, 100vw" /></div>
        <div className="flex flex-col items-center justify-center px-6 py-14 text-center lg:items-end lg:pr-16 lg:text-right">
          <p className="relative font-elegant text-sm italic tracking-[0.12em] text-taupe lg:before:absolute lg:before:-left-40 lg:before:top-1/2 lg:before:h-px lg:before:w-32 lg:before:bg-petal-deep">{since}</p>
          <h1 id="decor-hero-h" className="mt-6 font-elegant text-4xl font-normal leading-tight text-charcoal sm:text-5xl" style={{ color: undefined }}>
            Your favourite<br />Party &amp; Event Decor Studio
          </h1>
          <OutlineButton href={shopHref} className="mt-8">Shop decoration</OutlineButton>
        </div>
      </div>
    </section>
  );
}

/** Centred blush intro: kicker, large italic headline, paragraph, button. */
export function Intro() {
  return (
    <section aria-labelledby="intro-h" className="bg-petal px-6 py-24 text-center">
      <Kicker>Making celebrations with passion</Kicker>
      <Elegant id="intro-h" className="mx-auto mt-8 max-w-xl text-5xl sm:text-6xl">We bring colour and joy to your celebration!</Elegant>
      <p className="mx-auto mt-10 max-w-2xl text-lg font-light leading-relaxed text-charcoal/80">
        Birthdays, weddings, naming ceremonies and quiet dinners at home: the right balloons, toppers and table pieces turn a gathering into a memory. Shop ready-made pieces or let us style the whole event.
      </p>
      <OutlineButton href="/services/request?service=event-decoration" className="mt-10">What we do</OutlineButton>
    </section>
  );
}

/** Heading and button on the left, a tall and a shorter photo side by side. */
export function SplitPhotos({ images, shopHref }: { images: (string | null)[]; shopHref: string }) {
  return (
    <section aria-labelledby="split-h" className="bg-paper px-6 py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1fr_1.4fr_1fr]">
        <div className="text-center">
          <CondensedHeading id="split-h">When words<br />are not<br />enough</CondensedHeading>
          <p className="mt-8 font-elegant text-2xl italic text-taupe">Ready-made and custom decoration</p>
          <OutlineButton href={shopHref} className="mt-8">Order now</OutlineButton>
        </div>
        <div className="relative aspect-[3/4] bg-petal"><Photo src={images[0] ?? null} alt="" sizes="(min-width: 1024px) 34vw, 90vw" /></div>
        <div className="relative hidden aspect-[3/4] self-start bg-petal-deep lg:mt-12 lg:block"><Photo src={images[1] ?? null} alt="" sizes="25vw" /></div>
      </div>
    </section>
  );
}

export function Bestsellers({ products }: { products: ProductCard[] }) {
  if (!products.length) return null;
  return (
    <section aria-labelledby="best-h" className="bg-paper px-6 pb-24">
      <Elegant id="best-h" className="text-center text-5xl sm:text-6xl">Our seasonal bestsellers:</Elegant>
      <ul className="mx-auto mt-14 grid max-w-6xl gap-10 sm:grid-cols-2 lg:grid-cols-3">
        {products.slice(0, 3).map((p) => <li key={p.id}><DecorCard p={p} /></li>)}
      </ul>
    </section>
  );
}

/** Blush story band: condensed heading, short text, button, and a wide photo. */
export function Story({ banner, image }: { banner?: PublicBanner; image: string | null }) {
  return (
    <section aria-labelledby="story-h" className="bg-petal-deep px-6 py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1fr_2fr]">
        <div className="text-center">
          <CondensedHeading id="story-h">Love and joy<br />are in the air</CondensedHeading>
          <p className="mx-auto mt-6 max-w-xs text-[17px] font-light leading-relaxed text-charcoal/80">
            A few well-chosen pieces make people smile the moment they walk in. That’s what we help you create.
          </p>
          <OutlineButton href="/services" className="mt-8">Our story</OutlineButton>
        </div>
        <div className="relative aspect-[7/5] bg-petal"><Photo banner={banner} src={image} alt="" sizes="(min-width: 1024px) 60vw, 90vw" /></div>
      </div>
    </section>
  );
}

export function Inspired({ hashtag, instagram }: { hashtag: string; instagram?: string }) {
  return (
    <section aria-labelledby="inspired-h" className="bg-paper px-6 pb-24 text-center">
      <Elegant id="inspired-h" className="mx-auto max-w-2xl text-5xl sm:text-6xl">Inspired by the joy of celebrating, created with love</Elegant>
      <p className="mt-10 font-condensed text-lg uppercase tracking-[0.12em] text-charcoal">
        Follow us{' '}
        {instagram ? <a href={instagram} target="_blank" rel="noopener noreferrer" className="text-taupe hover:underline">{hashtag}</a> : <span className="text-taupe">{hashtag}</span>}
      </p>
    </section>
  );
}
