'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { formatMoney, pageWindow } from '@/lib/format';
import type { ProductCard } from '@/lib/types';
import { CakeCard } from './CakeCard';

function useUrl() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return {
    params,
    set(next: Record<string, string | null>, keepPage = false) {
      const p = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(next)) (v ? p.set(k, v) : p.delete(k));
      if (!keepPage) p.delete('page');
      router.push(`${pathname}${p.size ? `?${p}` : ''}`, { scroll: false });
    },
  };
}

const H = ({ children }: { children: React.ReactNode }) => <h2 className="border-b-2 border-[#2F5D62] pb-3 font-sans text-xl font-normal text-charcoal" style={{ color: undefined }}>{children}</h2>;
const smallBtn = 'rounded-sm bg-rose px-4 py-2 text-sm text-paper hover:bg-rose-deep';

/** Availability: in stock / sold out radios with counts, Clear and Apply. */
export function AvailabilityFilter({ inCount, outCount }: { inCount: number; outCount: number }) {
  const { params, set } = useUrl();
  const [v, setV] = useState(params.get('stock') ?? '');
  return (
    <section aria-labelledby="avail-h">
      <H><span id="avail-h">Availability</span></H>
      <fieldset className="mt-5 space-y-3">
        <legend className="sr-only">Availability</legend>
        {([['in', `In stock (${inCount})`], ['out', `Sold out (${outCount})`]] as const).map(([val, label]) => (
          <label key={val} className="flex cursor-pointer items-center gap-3 text-[15px]">
            <input type="radio" name="stock" value={val} checked={v === val} onChange={() => setV(val)} className="size-6 accent-rose" />
            {label}
          </label>
        ))}
      </fieldset>
      <div className="mt-4 flex gap-2">
        <button type="button" className={smallBtn} onClick={() => { setV(''); set({ stock: null }); }}>Clear</button>
        <button type="button" className={smallBtn} onClick={() => set({ stock: v || null })}>Apply</button>
      </div>
    </section>
  );
}

/** Price from/to (GHS), Clear and Apply. */
export function PriceRange({ highest }: { highest: string | null }) {
  const { params, set } = useUrl();
  const [from, setFrom] = useState(params.get('minPrice') ?? '');
  const [to, setTo] = useState(params.get('maxPrice') ?? '');
  return (
    <section aria-labelledby="price-h">
      <H><span id="price-h">Price</span></H>
      {highest && <p className="mt-5 text-sm">The highest price is {formatMoney(highest)}</p>}
      <label htmlFor="pf" className="mt-3 block text-sm">From GHS</label>
      <input id="pf" type="number" min={0} inputMode="decimal" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 h-11 w-full border border-flour px-3" />
      <label htmlFor="pt" className="mt-3 block text-sm">To GHS</label>
      <input id="pt" type="number" min={0} inputMode="decimal" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 h-11 w-full border border-flour px-3" />
      <div className="mt-4 flex gap-2">
        <button type="button" className={smallBtn} onClick={() => { setFrom(''); setTo(''); set({ minPrice: null, maxPrice: null }); }}>Clear</button>
        <button type="button" className={smallBtn} onClick={() => set({ minPrice: from || null, maxPrice: to || null })}>Apply</button>
      </div>
    </section>
  );
}

export function ClearAll() {
  const router = useRouter();
  return <button type="button" onClick={() => router.push('/cakes/shop')} className="btn w-full bg-rose text-paper hover:bg-rose-deep">Clear all</button>;
}

/** Grid/list switch, items per page, sort. */
export function ShopToolbar() {
  const { params, set } = useUrl();
  const view = params.get('view') === 'list' ? 'list' : 'grid';
  const btn = (active: boolean) => `inline-flex size-9 items-center justify-center ${active ? 'bg-rose text-paper' : 'bg-paper text-charcoal ring-1 ring-flour hover:bg-blush'}`;
  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-3 bg-flour/60 px-4 py-4">
      <div className="flex" role="group" aria-label="Layout">
        <button type="button" aria-label="Grid view" aria-pressed={view === 'grid'} className={btn(view === 'grid')} onClick={() => set({ view: null }, true)}>
          <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="currentColor"><path d="M4 4h4v4H4zM10 4h4v4h-4zM16 4h4v4h-4zM4 10h4v4H4zM10 10h4v4h-4zM16 10h4v4h-4zM4 16h4v4H4zM10 16h4v4h-4zM16 16h4v4h-4z" /></svg>
        </button>
        <button type="button" aria-label="List view" aria-pressed={view === 'list'} className={btn(view === 'list')} onClick={() => set({ view: 'list' }, true)}>
          <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="currentColor"><path d="M4 5h3v3H4zM9 5h11v3H9zM4 11h3v3H4zM9 11h11v3H9zM4 17h3v3H4zM9 17h11v3H9z" /></svg>
        </button>
      </div>
      <label className="flex items-center gap-2 text-[15px] sm:mx-auto">
        Show
        <select className="h-9 rounded-sm bg-rose px-2 text-paper" value={params.get('show') ?? '9'} onChange={(e) => set({ show: e.target.value === '9' ? null : e.target.value })}>
          {[9, 18, 36].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>
      <label className="flex items-center gap-2 text-[15px]">
        Sort by
        <select className="h-9 w-44 rounded-sm bg-rose px-2 text-paper" value={params.get('sort') ?? 'newest'} onChange={(e) => set({ sort: e.target.value === 'newest' ? null : e.target.value })}>
          <option value="newest">Newest</option>
          <option value="name">Name, A–Z</option>
          <option value="price_asc">Price, low to high</option>
          <option value="price_desc">Price, high to low</option>
        </select>
      </label>
    </div>
  );
}

/** Small one-at-a-time carousel in the sidebar ("Creamy cakes" in the reference). */
export function SideCarousel({ title, products }: { title: string; products: ProductCard[] }) {
  const [i, setI] = useState(0);
  if (!products.length) return null;
  const p = products[i];
  const arrow = 'absolute top-[52%] z-20 inline-flex size-10 items-center justify-center rounded-sm bg-rose text-paper hover:bg-rose-deep disabled:opacity-40';
  return (
    <section aria-labelledby="side-c-h" className="border-b border-flour pb-6">
      <H><span id="side-c-h">{title}</span></H>
      <div className="relative mt-5" aria-live="polite">
        <CakeCard p={p} />
        <button type="button" className={`${arrow} left-0`} onClick={() => setI(i - 1)} disabled={i === 0} aria-label="Previous"><svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 6-6 6 6 6" /></svg></button>
        <button type="button" className={`${arrow} right-0`} onClick={() => setI(i + 1)} disabled={i >= products.length - 1} aria-label="Next"><svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 6 6 6-6 6" /></svg></button>
      </div>
    </section>
  );
}

/** Numbered page buttons: rose squares, current page in sky blue. */
export function NumberedPager({ page, totalPages }: { page: number; totalPages: number }) {
  const params = useSearchParams();
  const pathname = usePathname();
  if (totalPages <= 1) return null;
  const href = (n: number) => { const p = new URLSearchParams(params.toString()); p.set('page', String(n)); return `${pathname}?${p}`; };
  const pages = pageWindow(page, totalPages);
  const cls = 'inline-flex h-9 min-w-9 items-center justify-center rounded-sm px-2 text-sm text-paper';
  return (
    <nav aria-label="Pagination" className="mt-10 flex justify-center gap-1.5">
      {page > 1 && <Link href={href(page - 1)} className={`${cls} bg-rose hover:bg-rose-deep`} aria-label="Previous page">‹</Link>}
      {pages.map((n) => (
        <Link key={n} href={href(n)} aria-current={n === page ? 'page' : undefined} className={`${cls} ${n === page ? 'bg-[#2F7F93]' : 'bg-rose hover:bg-rose-deep'}`}>{n}</Link>
      ))}
      {page < totalPages && <Link href={href(page + 1)} className={`${cls} bg-rose hover:bg-rose-deep`} aria-label="Next page">›</Link>}
    </nav>
  );
}
