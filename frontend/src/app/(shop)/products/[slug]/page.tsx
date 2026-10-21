import type { Metadata } from 'next';
import { BannerSlot } from '@/components/marketing/BannerSlot';
import { BuyBox } from '@/components/product/detail/BuyBox';
import { Gallery } from '@/components/product/detail/Gallery';
import { ProductTabs } from '@/components/product/detail/ProductTabs';
import { RelatedProducts } from '@/components/product/RelatedProducts';
import { StoreColumns } from '@/components/store/StoreColumns';
import { serverGet } from '@/lib/api/server';
import { siteConfig } from '@/lib/config';
import type { ProductCard } from '@/lib/types';
import { getProductOrNotFound } from '@/lib/api/products-server';

type Props = { params: Promise<{ slug: string }> };

const getProduct = getProductOrNotFound;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getProduct((await params).slug);
  return {
    title: p.name,
    description: p.description.slice(0, 160),
    alternates: { canonical: `/products/${p.slug}` },
    openGraph: { images: p.images.slice(0, 1) },
  };
}

export default async function ProductPage({ params }: Props) {
  const product = await getProduct((await params).slug);
  const related = await serverGet<ProductCard[]>(`/products/recommendations?ids=${product.id}&limit=10`, 60).catch(() => product.related);
  const specs = Array.isArray(product.attributes?.specs) ? product.attributes!.specs! : [];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.images,
    sku: product.variants[0]?.sku,
    ...(product.brand ? { brand: { '@type': 'Brand', name: product.brand } } : {}),
    ...(product.rating && product.rating.count > 0 ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: product.rating.average, reviewCount: product.rating.count } } : {}),
    offers: product.variants.map((v) => ({
      '@type': 'Offer',
      price: v.price,
      priceCurrency: siteConfig.currency,
      availability: v.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    })),
  };

  return (
    <StoreColumns crumbs={[{ label: product.category.name, href: `/categories/${product.category.slug}` }, { label: product.name }]}>
      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Gallery images={product.images} name={product.name} />
        <BuyBox product={product} />
      </div>

      <ProductTabs slug={product.slug} name={product.name} description={product.description} specs={specs} reviewCount={product.rating?.count ?? 0} />

      <div className="mt-8"><BannerSlot placement="product.below" /></div>

      <RelatedProducts products={related} exclude={[product.id]} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
    </StoreColumns>
  );
}
