import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PriceFilter } from '@/components/store/ListingToolbar';
import { StoreColumns } from '@/components/store/StoreColumns';
import { notFound } from 'next/navigation';
import { ProductListing } from '@/components/product/ProductListing';
import { BannerSlot } from '@/components/marketing/BannerSlot';
import { ApiError } from '@/lib/api/errors';
import { serverGet } from '@/lib/api/server';
import type { Category } from '@/lib/types';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> };

async function getCategory(slug: string) {
  try {
    return await serverGet<Category>(`/categories/${encodeURIComponent(slug)}`, 300);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await getCategory((await params).slug);
  return { title: c.name, description: c.description ?? undefined, alternates: { canonical: `/categories/${c.slug}` } };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const category = await getCategory(slug);
  return (
    <StoreColumns crumbs={[{ label: 'Shop', href: '/shop' }, { label: category.name }]} filters={<Suspense fallback={null}><PriceFilter /></Suspense>}>
      <h1 className="font-sans text-2xl font-normal text-charcoal">{category.name}</h1>
      {category.description && <p className="mt-2 max-w-2xl text-muted">{category.description}</p>}
      <div className="my-4"><BannerSlot placement="category.top" /></div>
      <ProductListing basePath={`/categories/${slug}`} searchParams={await searchParams} category={slug} />
    </StoreColumns>
  );
}
