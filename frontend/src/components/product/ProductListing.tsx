import Link from 'next/link';
import { Suspense } from 'react';
import { ListingToolbar } from '@/components/store/ListingToolbar';
import { PAGE_SIZES } from '@/lib/listing';
import { ProductListRow } from '@/components/store/ProductListRow';
import { query, serverGet } from '@/lib/api/server';
import type { Paginated, ProductCard } from '@/lib/types';
import { Pagination } from './Pagination';
import { ProductCard as Card } from './ProductCard';

/** Server-rendered, URL-driven listing used by shop, category, specials, brand and search pages. */
export async function ProductListing({ basePath, searchParams, category, preset = {}, emptyText }: {
  basePath: string;
  searchParams: Record<string, string | undefined>;
  category?: string;
  preset?: Record<string, string>;
  emptyText?: string;
}) {
  const show = PAGE_SIZES.includes(Number(searchParams.show) as (typeof PAGE_SIZES)[number]) ? Number(searchParams.show) : PAGE_SIZES[0];
  const params = {
    q: searchParams.q,
    sort: searchParams.sort,
    minPrice: searchParams.minPrice,
    maxPrice: searchParams.maxPrice,
    inStock: searchParams.inStock,
    onSale: searchParams.onSale,
    brand: searchParams.brand,
    view: searchParams.view,
    show: searchParams.show,
  };
  const page = Math.max(1, Number(searchParams.page) || 1);
  const { view: _v, show: _s, ...api } = params;
  const data = await serverGet<Paginated<ProductCard>>(`/products${query({ ...api, ...preset, category, page, limit: show })}`, 30);
  const list = searchParams.view === 'list';
  const from = data.total ? (data.page - 1) * data.limit + 1 : 0;
  const to = Math.min(data.page * data.limit, data.total);

  return (
    <>
      <Suspense fallback={null}><ListingToolbar /></Suspense>
      <section aria-label="Products" className="bg-paper p-5 shadow-[0_1px_6px_var(--color-panel-shadow)]">
        {data.items.length ? (
          list ? (
            <ul className="space-y-5">{data.items.map((p) => <li key={p.id}><ProductListRow p={p} /></li>)}</ul>
          ) : (
            <ul className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 xl:grid-cols-4">
              {data.items.map((p, i) => <li key={p.id}><Card product={p} priority={i < 4} /></li>)}
            </ul>
          )
        ) : (
          <div className="py-10 text-center">
            <p>{emptyText ?? 'There are no products to list here yet.'}</p>
            <Link href="/" className="btn btn-primary mt-5">Continue</Link>
          </div>
        )}
      </section>
      {data.total > 0 && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
          <p role="status">Showing {from} to {to} of {data.total} ({data.totalPages} {data.totalPages === 1 ? 'page' : 'pages'})</p>
          <Pagination page={data.page} totalPages={data.totalPages} basePath={basePath} params={params} />
        </div>
      )}
    </>
  );
}