import type { Metadata } from 'next';
import { Collections, type CollectionCard } from '@/components/decor/Collections';
import { Bestsellers, DecorHero, Inspired, Intro, SplitPhotos, Story } from '@/components/decor/Sections';
import { serverGet } from '@/lib/api/server';
import type { PublicBanner } from '@/lib/api/marketing';
import type { Category, Paginated, ProductCard } from '@/lib/types';
import { findDepartment } from '@/lib/departments';

export const metadata: Metadata = {
  title: 'Party and event decoration',
  description: 'Balloons, cake toppers, table styling and party decoration, plus full event styling.',
  alternates: { canonical: '/decor' },
};

const get = <T,>(path: string, fallback: T, revalidate = 60) => serverGet<T>(path, revalidate).catch(() => fallback);
const items = (p: Paginated<ProductCard> | null) => p?.items ?? [];

export default async function DecorHome() {
  const categories = await get<Category[]>('/categories', [], 300);
  const decor = findDepartment(categories, 'decor');
  const slug = decor?.slug;
  const shopHref = '/decor/shop';
  const q = (extra: string) => (slug ? `/products?category=${encodeURIComponent(slug)}&${extra}` : `/products?${extra}`);
  const subs = decor?.children ?? [];

  const [hero, feature, featured, newest, subPhotos] = await Promise.all([
    get<PublicBanner[]>('/banners?placement=decor.hero', []),
    get<PublicBanner[]>('/banners?placement=decor.feature', []),
    get<Paginated<ProductCard> | null>(q('featured=true&limit=6'), null),
    get<Paginated<ProductCard> | null>(q('sort=newest&limit=8'), null),
    Promise.all(subs.slice(0, 9).map((s) => (s.imageUrl ? Promise.resolve(s.imageUrl) : get<Paginated<ProductCard> | null>(`/products?category=${encodeURIComponent(s.slug)}&limit=1`, null).then((r) => r?.items[0]?.images[0] ?? null)))),
  ]);

  const best = items(featured).length ? items(featured) : items(newest);
  const photos = [decor?.imageUrl ?? null, ...best.map((p) => p.images[0] ?? null), ...items(newest).map((p) => p.images[0] ?? null)].filter(Boolean) as string[];
  const since = process.env.NEXT_PUBLIC_ESTABLISHED ? `crafting celebrations since ${process.env.NEXT_PUBLIC_ESTABLISHED}` : 'crafting beautiful celebrations';

  // "From our journal" becomes your decoration collections (sub-categories), else newest pieces.
  const cards: CollectionCard[] = subs.length
    ? subs.map((s, n) => ({ key: s.id, title: s.name, href: `/decor/shop?category=${s.slug}`, image: subPhotos[n] ?? null }))
    : items(newest).slice(0, 6).map((p) => ({ key: p.id, title: p.name, href: `/decor/products/${p.slug}`, image: p.images[0] ?? null }));

  return (
    <>
      <DecorHero banner={hero[0]} image={photos[0] ?? null} since={since} shopHref={shopHref} />
      <Intro />
      <SplitPhotos images={[photos[1] ?? null, photos[2] ?? null]} shopHref={shopHref} />
      <Bestsellers products={best} />
      <Story banner={feature[0]} image={photos[3] ?? null} />
      <Collections title={subs.length ? 'Our collections:' : 'New in the studio:'} cards={cards} />
      <Inspired hashtag={process.env.NEXT_PUBLIC_HASHTAG ?? '#celebratewithus'} instagram={process.env.NEXT_PUBLIC_INSTAGRAM_URL} />
    </>
  );
}
