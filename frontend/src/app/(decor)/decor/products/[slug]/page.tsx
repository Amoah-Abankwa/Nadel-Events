import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { DecorCard } from '@/components/decor/DecorCard';
import { DecorBuy, DecorGallery, DecorTabs } from '@/components/decor/DecorProduct';
import { DecorSidebar, TrackView } from '@/components/decor/DecorSidebar';
import { Suspense } from 'react';
import { serverGet } from '@/lib/api/server';
import type { Category, Paginated, ProductCard, ProductDetail } from '@/lib/types';
import { findDepartment, flattenCategory } from '@/lib/departments';
import { getProductOrNotFound } from '@/lib/api/products-server';

type Props = { params: Promise<{ slug: string }> };

const getProduct = getProductOrNotFound;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getProduct((await params).slug);
  return { title: p.name, description: p.description.slice(0, 160), alternates: { canonical: `/products/${p.slug}` }, openGraph: { images: p.images.slice(0, 1) } };
}

export default async function DecorProductPage({ params }: Props) {
  const { slug } = await params;
  const [product, categories] = await Promise.all([getProduct(slug), serverGet<Category[]>('/categories', 300).catch(() => [] as Category[])]);
  const decor = findDepartment(categories, 'decor');
  const decorTree = decor ? flattenCategory(decor) : [];
  // Only decoration lives here; anything else opens on the main product page.
  if (!decorTree.some((c) => c.slug === product.category.slug)) redirect(`/products/${product.slug}`);

  const [popular, related] = await Promise.all([
    serverGet<Paginated<ProductCard>>(`/products?category=${encodeURIComponent(decor!.slug)}&featured=true&limit=4`, 300).then((r) => r.items.filter((p) => p.id !== product.id).slice(0, 3)).catch(() => [] as ProductCard[]),
    serverGet<ProductCard[]>(`/products/recommendations?ids=${product.id}&limit=6`, 60).then((r) => r.filter((p) => decorTree.some((c) => c.slug === p.category.slug)).slice(0, 3)).catch(() => [] as ProductCard[]),
  ]);
  const specs = Array.isArray(product.attributes?.specs) ? product.attributes!.specs! : [];
  const intro = product.description.trim().split(/\n\s*\n/)[0]?.replace(/^- /gm, '') ?? '';

  return (
    <>
      <TrackView v={{ slug: product.slug, name: product.name, image: product.images[0] ?? null, price: product.price, compareAtPrice: product.compareAtPrice }} />
      <div className="border-b border-petal-deep px-6 py-16 text-center">
        <h1 className="font-elegant text-5xl font-normal italic text-charcoal sm:text-6xl" style={{ color: undefined }}>{product.name}</h1>
        <nav aria-label="Breadcrumb" className="mt-4 text-[15px]">
          <ol className="flex flex-wrap justify-center gap-1.5 font-semibold">
            <li><Link href="/decor" className="hover:text-taupe">Home</Link> :</li>
            <li><Link href={`/decor/shop?category=${product.category.slug}`} className="hover:text-taupe">{product.category.name}</Link> :</li>
            <li aria-current="page" className="text-taupe">{product.name}</li>
          </ol>
        </nav>
      </div>

      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-14 lg:grid-cols-[1fr_15rem]">
        <div className="min-w-0">
          <div className="grid gap-10 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <DecorGallery product={product} />
            <DecorBuy product={product} intro={intro} />
          </div>
          <DecorTabs product={product} specs={specs} />
          {related.length > 0 && (
            <section aria-labelledby="also-h" className="mt-20">
              <h2 id="also-h" className="text-center font-elegant text-4xl font-normal italic text-charcoal" style={{ color: undefined }}>You may also like:</h2>
              <ul className="mt-10 grid gap-10 sm:grid-cols-3">{related.map((p) => <li key={p.id}><DecorCard p={p} /></li>)}</ul>
            </section>
          )}
        </div>

        <Suspense fallback={null}>
          <DecorSidebar categories={decor!.children.length ? decor!.children : [decor!]} current={product.category.slug} popular={popular} />
        </Suspense>
      </div>
    </>
  );
}
