'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { PAGE_SIZES } from '@/lib/listing';

const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'name', label: 'Name (A–Z)' },
  { value: 'price_asc', label: 'Price (low to high)' },
  { value: 'price_desc', label: 'Price (high to low)' },
];

function useUrlUpdate() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return {
    params,
    update(next: Record<string, string | null>, resetPage = true) {
      const p = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(next)) (v ? p.set(k, v) : p.delete(k));
      if (resetPage) p.delete('page');
      router.push(`${pathname}${p.size ? `?${p.toString()}` : ''}`, { scroll: false });
    },
  };
}

const viewBtn = 'inline-flex size-9 items-center justify-center rounded-sm border';

/** Grid/list switch, in-stock toggle, sort and page size, all kept in the URL. */
export function ListingToolbar() {
  const { params, update } = useUrlUpdate();
  const view = params.get('view') === 'list' ? 'list' : 'grid';
  return (
    <div className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-3 bg-paper px-5 py-3.5 shadow-[0_1px_6px_var(--color-panel-shadow)]">
      <div className="flex gap-2" role="group" aria-label="Layout">
        <button type="button" aria-label="List view" aria-pressed={view === 'list'} onClick={() => update({ view: 'list' }, false)}
          className={`${viewBtn} ${view === 'list' ? 'border-burgundy bg-burgundy text-paper' : 'border-crust text-charcoal hover:bg-flour'}`}>
          <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 6h11M9 12h11M9 18h11M4 6h1M4 12h1M4 18h1" /></svg>
        </button>
        <button type="button" aria-label="Grid view" aria-pressed={view === 'grid'} onClick={() => update({ view: null }, false)}
          className={`${viewBtn} ${view === 'grid' ? 'border-burgundy bg-burgundy text-paper' : 'border-crust text-charcoal hover:bg-flour'}`}>
          <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="6" height="6" /><rect x="14" y="4" width="6" height="6" /><rect x="4" y="14" width="6" height="6" /><rect x="14" y="14" width="6" height="6" /></svg>
        </button>
      </div>

      <label className="flex items-center gap-2 text-[15px] text-burgundy">
        <input type="checkbox" className="size-4 accent-burgundy" checked={params.get('inStock') === 'true'} onChange={(e) => update({ inStock: e.target.checked ? 'true' : null })} />
        In stock only
      </label>

      <div className="ml-auto flex flex-wrap items-center gap-x-6 gap-y-2">
        <label className="flex items-center gap-3 text-[15px]">
          Sort by:
          <select className="field h-9 min-h-0 w-48 py-0 text-sm" value={params.get('sort') ?? 'newest'} onChange={(e) => update({ sort: e.target.value === 'newest' ? null : e.target.value })}>
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-3 text-[15px]">
          Show:
          <select className="field h-9 min-h-0 w-20 py-0 text-sm" value={params.get('show') ?? String(PAGE_SIZES[0])} onChange={(e) => update({ show: e.target.value === String(PAGE_SIZES[0]) ? null : e.target.value })}>
            {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>
    </div>
  );
}

/** Sidebar price filter (GHS), applied on submit. */
export function PriceFilter() {
  const { params, update } = useUrlUpdate();
  return (
    <form
      aria-labelledby="price-h"
      className="bg-paper p-5 shadow-[0_1px_6px_var(--color-panel-shadow)]"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        update({ minPrice: String(f.get('minPrice') || '') || null, maxPrice: String(f.get('maxPrice') || '') || null });
      }}
    >
      <h2 id="price-h" className="border-b border-flour pb-3 font-sans text-base font-bold uppercase tracking-wide">Price (GHS)</h2>
      <div className="mt-4 flex items-center gap-2">
        <label className="sr-only" htmlFor="minPrice">Minimum price</label>
        <input id="minPrice" name="minPrice" type="number" min={0} inputMode="decimal" placeholder="Min" defaultValue={params.get('minPrice') ?? ''} className="field h-10 min-h-0 text-sm" />
        <span aria-hidden>–</span>
        <label className="sr-only" htmlFor="maxPrice">Maximum price</label>
        <input id="maxPrice" name="maxPrice" type="number" min={0} inputMode="decimal" placeholder="Max" defaultValue={params.get('maxPrice') ?? ''} className="field h-10 min-h-0 text-sm" />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button type="submit" className="btn btn-primary h-9 min-h-0">Filter</button>
        {(params.get('minPrice') || params.get('maxPrice')) && (
          <button type="button" className="text-sm underline" onClick={() => update({ minPrice: null, maxPrice: null })}>Clear</button>
        )}
      </div>
    </form>
  );
}