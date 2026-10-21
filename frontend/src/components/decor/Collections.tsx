'use client';

import Link from 'next/link';
import { useScroller } from '@/components/home/useScroller';
import { ProductImage } from '@/components/product/ProductImage';
import { Elegant } from './Bits';

export interface CollectionCard { key: string; title: string; href: string; image: string | null }

/** Three-across carousel with square arrow buttons underneath ("From our journal" in the reference). */
export function Collections({ title, cards }: { title: string; cards: CollectionCard[] }) {
  const s = useScroller<HTMLUListElement>([cards.length]);
  if (!cards.length) return null;
  const btn = 'inline-flex size-11 items-center justify-center border border-petal-deep bg-paper text-taupe hover:border-taupe disabled:opacity-40';
  return (
    <section aria-labelledby="collections-h" className="bg-paper py-20">
      <Elegant id="collections-h" className="text-center text-5xl sm:text-6xl">{title}</Elegant>
      <ul ref={s.ref} className="mx-auto mt-12 flex max-w-6xl snap-x snap-mandatory gap-8 overflow-x-auto px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {cards.map((c) => (
          <li key={c.key} className="w-[85%] shrink-0 snap-start text-center sm:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1.34rem)]">
            <Link href={c.href} className="group block">
              <span className="relative block aspect-[4/3] overflow-hidden bg-petal">
                {c.image ? <span className="block size-full transition-transform duration-500 group-hover:scale-105"><ProductImage src={c.image} alt="" sizes="(min-width: 1024px) 30vw, 85vw" /></span>
                  : <span className="flex size-full items-center justify-center font-elegant text-3xl italic text-taupe">{c.title}</span>}
              </span>
              <span className="mt-6 block font-condensed text-base uppercase tracking-[0.15em] text-charcoal group-hover:text-taupe">{c.title}</span>
            </Link>
          </li>
        ))}
      </ul>
      {cards.length > 3 && (
        <div className="mt-10 flex justify-center gap-3">
          <button type="button" className={btn} onClick={s.prev} disabled={s.atStart} aria-label="Previous"><svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M19 12H5m6-6-6 6 6 6" /></svg></button>
          <button type="button" className={btn} onClick={s.next} disabled={s.atEnd} aria-label="Next"><svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 12h14m-6-6 6 6-6 6" /></svg></button>
        </div>
      )}
    </section>
  );
}
