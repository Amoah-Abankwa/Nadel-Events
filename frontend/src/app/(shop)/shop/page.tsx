import type { Metadata } from 'next';
import { ProductListing } from '@/components/product/ProductListing';
import { PriceFilter } from '@/components/store/ListingToolbar';
import { StoreColumns } from '@/components/store/StoreColumns';
import { Suspense } from 'react';

export const metadata: Metadata = { title: 'Shop cakes, decoration and kitchenware' };

type SP = Promise<Record<string, string | undefined>>;

export default async function ShopPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const title = sp.q ? `Search: “${sp.q}”` : sp.brand ? sp.brand : 'All products';
  return (
    <StoreColumns crumbs={[...(sp.brand ? [{ label: 'Brands', href: '/brands' }] : []), { label: title }]} filters={<Suspense fallback={null}><PriceFilter /></Suspense>}>
      <h1 className="mb-4 font-sans text-2xl font-normal text-charcoal">{title}</h1>
      <ProductListing basePath="/shop" searchParams={sp} emptyText={sp.q ? `Nothing matched “${sp.q}”. Try another word, like “cake stand” or “whisk”.` : undefined} />
    </StoreColumns>
  );
}
