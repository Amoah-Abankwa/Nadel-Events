import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ProductListing } from '@/components/product/ProductListing';
import { PriceFilter } from '@/components/store/ListingToolbar';
import { StoreColumns } from '@/components/store/StoreColumns';

export const metadata: Metadata = { title: 'Special offers', description: 'Discounted cakes, decoration and kitchenware.' };

export default async function SpecialsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return (
    <StoreColumns crumbs={[{ label: 'Special offers' }]} filters={<Suspense fallback={null}><PriceFilter /></Suspense>}>
      <h1 className="mb-4 font-sans text-2xl font-normal text-charcoal">Special offers</h1>
      <ProductListing basePath="/specials" searchParams={await searchParams} preset={{ onSale: 'true' }} emptyText="There are no special offers right now. Check back soon." />
    </StoreColumns>
  );
}
