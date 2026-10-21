import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { DecorCard } from '@/components/decor/DecorCard';
import { DecorSidebar } from '@/components/decor/DecorSidebar';
import { SortSelect, SquarePager } from '@/components/decor/ShopBits';
import { query, serverGet } from '@/lib/api/server';
import type { Category, Paginated, ProductCard } from '@/lib/types';
import { findDepartment, flattenCategory } from '@/lib/departments';

export const metadata: Metadata = { title: 'Shop decoration' };

type SP = Promise<Record<string, string | undefined>>;
const PER_PAGE = 9;

export default async function DecorShopPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const categories = await serverGet<Category[]>('/categories', 300).catch(() => [] as Category[]);
  const decor = findDepartment(categories, 'decor');
  const tree = decor ? flattenCategory(decor) : [];
  // Only decoration categories can be browsed here.
  const current = tree.find((c) => c.slug === sp.category) ?? decor;
  const page = Math.max(1, Number(sp.page) || 1);
  const filters = { category: current?.slug, q: sp.q, minPrice: sp.minPrice, maxPrice: sp.maxPrice };

  const [data, popular, lowest, highest] = await Promise.all([
    serverGet<Paginated<ProductCard>>(`/products${query({ ...filters, sort: sp.sort, page, limit: PER_PAGE })}`, 30).catch(() => null),
    serverGet<Paginated<ProductCard>>(`/products${query({ category: decor?.slug, featured: true, limit: 3 })}`, 300).then((r) => r.items).catch(() => [] as ProductCard[]),
    serverGet<Paginated<ProductCard>>(`/products${query({ category: decor?.slug, sort: 'price_asc', limit: 1 })}`, 300).then((r) => Number(r.items[0]?.price ?? 0)).catch(() => 0),
    serverGet<Paginated<ProductCard>>(`/products${query({ category: decor?.slug, sort: 'price_desc', limit: 1 })}`, 300).then((r) => Number(r.items[0]?.price ?? 0)).catch(() => 0),
  ]);
  const items = data?.items ?? [];
  const isSub = current && decor && current.id !== decor.id;
  const heading = sp.q ? `Search: ${sp.q}` : isSub ? current.name : 'Shop';
  const from = data && data.total ? (data.page - 1) * data.limit + 1 : 0;
  const to = data ? Math.min(data.page * data.limit, data.total) : 0;

  return (
    <>
      <div className="border-b border-petal-deep px-6 py-16 text-center">
        <p aria-hidden className="font-elegant text-6xl italic text-charcoal">{isSub ? current.name : 'Shop'}</p>
        <nav aria-label="Breadcrumb" className="mt-4 text-[15px] font-semibold">
          <ol className="flex flex-wrap justify-center gap-1.5">
            <li><Link href="/decor" className="hover:text-taupe">Home</Link> :</li>
            {isSub ? <><li><Link href="/decor/shop" className="hover:text-taupe">Shop</Link> :</li><li aria-current="page" className="text-taupe">{current.name}</li></> : <li aria-current="page" className="text-taupe">Shop</li>}
          </ol>
        </nav>
      </div>

      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-14 lg:grid-cols-[1fr_15rem]">
        <div className="min-w-0">
          <h1 className="font-elegant text-5xl font-normal italic text-charcoal" style={{ color: undefined }}>{heading}</h1>
          {isSub && current.description && <p className="mt-3 max-w-2xl font-light text-charcoal/80">{current.description}</p>}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <Suspense fallback={null}><SortSelect /></Suspense>
            <p className="text-[15px] font-semibold" role="status">{data?.total ? `Showing ${from}–${to} of ${data.total} results` : 'No results'}</p>
          </div>

          {items.length ? (
            <ul className="mt-10 grid grid-cols-2 gap-x-5 gap-y-12 md:grid-cols-3">
              {items.map((p) => <li key={p.id}><DecorCard p={p} /></li>)}
            </ul>
          ) : (
            <div className="mt-12 text-center">
              <p className="font-light">No decoration matches this search yet.</p>
              <Link href="/decor/shop" className="mt-5 inline-block border border-charcoal px-6 py-2.5 font-condensed text-sm uppercase tracking-[0.15em] shadow-[3px_3px_0_var(--color-charcoal)]">Clear filters</Link>
            </div>
          )}
          {data && <Suspense fallback={null}><SquarePager page={data.page} totalPages={data.totalPages} /></Suspense>}
        </div>

        <Suspense fallback={null}>
          <DecorSidebar categories={decor ? (decor.children.length ? decor.children : [decor]) : []} current={current?.slug} popular={popular} priceBounds={{ min: lowest, max: highest }} />
        </Suspense>
      </div>
    </>
  );
}
