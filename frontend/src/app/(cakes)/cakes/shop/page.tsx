import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { AddButton, Badges, CakeCard, Price } from '@/components/cakes/CakeCard';
import { PageBanner } from '@/components/cakes/PageBanner';
import { AvailabilityFilter, ClearAll, NumberedPager, PriceRange, ShopToolbar, SideCarousel } from '@/components/cakes/ShopControls';
import { ProductImage } from '@/components/product/ProductImage';
import { query, serverGet } from '@/lib/api/server';
import type { Category, Paginated, ProductCard } from '@/lib/types';
import { findDepartment, flattenCategory } from '@/lib/departments';

export const metadata: Metadata = { title: 'Shop cakes' };

type SP = Promise<Record<string, string | undefined>>;
const SIZES = [9, 18, 36];

export default async function CakeShopPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const categories = await serverGet<Category[]>('/categories', 300).catch(() => [] as Category[]);
  const cake = findDepartment(categories, 'cakes');
  // Only cake categories can be browsed here; anything else falls back to all cakes.
  const allowed = cake ? flattenCategory(cake) : [];
  const current = allowed.find((c) => c.slug === sp.category) ?? cake;
  const show = SIZES.includes(Number(sp.show)) ? Number(sp.show) : 9;
  const page = Math.max(1, Number(sp.page) || 1);
  const base = { category: current?.slug, q: sp.q, minPrice: sp.minPrice, maxPrice: sp.maxPrice };

  const [data, inCount, outCount, top, creamy] = await Promise.all([
    serverGet<Paginated<ProductCard>>(`/products${query({ ...base, stock: sp.stock, sort: sp.sort, page, limit: show })}`, 30).catch(() => null),
    serverGet<Paginated<ProductCard>>(`/products${query({ ...base, stock: 'in', limit: 1 })}`, 60).then((r) => r.total).catch(() => 0),
    serverGet<Paginated<ProductCard>>(`/products${query({ ...base, stock: 'out', limit: 1 })}`, 60).then((r) => r.total).catch(() => 0),
    serverGet<Paginated<ProductCard>>(`/products${query({ category: current?.slug, sort: 'price_desc', limit: 1 })}`, 300).then((r) => r.items[0]?.price ?? null).catch(() => null),
    serverGet<Paginated<ProductCard>>(`/products${query({ category: cake?.slug, featured: true, limit: 6 })}`, 300).then((r) => r.items).catch(() => [] as ProductCard[]),
  ]);
  const items = data?.items ?? [];
  const list = sp.view === 'list';
  const title = sp.q ? `Search: ${sp.q}` : current && current.id !== cake?.id ? current.name : 'Collection';

  return (
    <>
      <PageBanner title={title} crumbs={[{ label: 'Shop', href: '/cakes/shop' }, ...(current && current.id !== cake?.id ? [{ label: current.name }] : [{ label: 'All cakes' }])]} />
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[14.5rem_1fr]">
        <aside className="order-2 space-y-10 lg:order-1" aria-label="Filters">
          {cake && (
            <section aria-labelledby="cat-h">
              <h2 id="cat-h" className="border-b-2 border-[#2F5D62] pb-3 font-sans text-xl font-normal text-charcoal" style={{ color: undefined }}>Category</h2>
              <ul className="mt-4 space-y-1 text-[15px]">
                <li><Link href="/cakes/shop" className={`block py-1.5 ${current?.id === cake.id ? 'font-semibold text-rose' : 'hover:text-rose'}`}>All cakes</Link></li>
                {cake.children.map((c) => (
                  <li key={c.id}>
                    {c.children.length ? (
                      <details open={c.children.some((x) => x.slug === sp.category) || undefined} className="group">
                        <summary className="flex cursor-pointer list-none items-center justify-between py-1.5 [&::-webkit-details-marker]:hidden">
                          <Link href={`/cakes/shop?category=${c.slug}`} className={c.slug === sp.category ? 'font-semibold text-rose' : 'hover:text-rose'}>{c.name}</Link>
                          <span aria-hidden className="text-xl leading-none group-open:hidden">+</span>
                          <span aria-hidden className="hidden text-xl leading-none group-open:inline">−</span>
                        </summary>
                        <ul className="mb-2 ml-4 space-y-1 text-sm">
                          {c.children.map((x) => <li key={x.id}><Link href={`/cakes/shop?category=${x.slug}`} className={x.slug === sp.category ? 'font-semibold text-rose' : 'hover:text-rose'}>{x.name}</Link></li>)}
                        </ul>
                      </details>
                    ) : (
                      <Link href={`/cakes/shop?category=${c.slug}`} className={`flex items-center justify-between py-1.5 ${c.slug === sp.category ? 'font-semibold text-rose' : 'hover:text-rose'}`}>{c.name}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
          <Suspense fallback={null}><AvailabilityFilter inCount={inCount} outCount={outCount} /></Suspense>
          <Suspense fallback={null}><PriceRange highest={top} /></Suspense>
          <ClearAll />
          <SideCarousel title="Customer favourites" products={creamy} />
        </aside>

        <div className="order-1 min-w-0 lg:order-2">
          <Suspense fallback={null}><ShopToolbar /></Suspense>
          {items.length === 0 ? (
            <div className="py-16 text-center">
              <p>No cakes match these filters.</p>
              <Link href="/cakes/shop" className="btn mt-5 bg-rose text-paper hover:bg-rose-deep">Clear all</Link>
            </div>
          ) : list ? (
            <ul className="mt-8 space-y-6">
              {items.map((p) => (
                <li key={p.id} className="group relative grid gap-6 border border-flour p-4 sm:grid-cols-[14rem_1fr]">
                  <Badges p={p} />
                  <Link href={`/products/${p.slug}`} tabIndex={-1} aria-hidden className="relative block aspect-square"><ProductImage src={p.images[0]} alt={p.name} sizes="14rem" /></Link>
                  <div className="flex flex-col justify-center text-center sm:text-left">
                    <h2 className="font-sans text-2xl font-normal text-muted" style={{ color: undefined }}><Link href={`/products/${p.slug}`} className="hover:text-rose">{p.name}</Link></h2>
                    <div className="mt-2 sm:[&_p]:justify-start"><Price p={p} /></div>
                    <p className="mt-2 text-sm text-muted">{p.category.name}{p.pickupOnly ? ' · pickup only' : ''}</p>
                    <div className="mt-4"><AddButton p={p} /></div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="mt-8 grid grid-cols-2 gap-6 md:grid-cols-3">
              {items.map((p) => <li key={p.id}><CakeCard p={p} outlined /></li>)}
            </ul>
          )}
          {data && <Suspense fallback={null}><NumberedPager page={data.page} totalPages={data.totalPages} /></Suspense>}
        </div>
      </div>
    </>
  );
}
