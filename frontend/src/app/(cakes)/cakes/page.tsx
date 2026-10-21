import type { Metadata } from 'next';
import { CakeHero, type CakeSlide } from '@/components/cakes/CakeHero';
import { CakeNewsletter } from '@/components/cakes/CakeNewsletter';
import { LayerSpotlight } from '@/components/cakes/LayerSpotlight';
import { BestDeals, CakeGrid, Creations, FeatureBand, FlavourTiles, type Creation, type Feature } from '@/components/cakes/Sections';
import { serverGet } from '@/lib/api/server';
import type { PublicBanner } from '@/lib/api/marketing';
import type { Category, Paginated, ProductCard } from '@/lib/types';
import { findDepartment } from '@/lib/departments';

export const metadata: Metadata = {
  title: 'Cakes, cupcakes and pastries',
  description: 'Celebration cakes, cupcakes and pastries baked to order. Custom cakes for birthdays, weddings and naming ceremonies.',
  alternates: { canonical: '/cakes' },
};

const get = <T,>(path: string, fallback: T, revalidate = 60) => serverGet<T>(path, revalidate).catch(() => fallback);
const items = (p: Paginated<ProductCard> | null) => p?.items ?? [];

export default async function CakesHome() {
  const categories = await get<Category[]>('/categories', [], 300);
  const cake = findDepartment(categories, 'cakes');
  const slug = cake?.slug;
  const subs = cake?.children ?? [];
  const q = (extra: string) => (slug ? `/products?category=${encodeURIComponent(slug)}&${extra}` : `/products?${extra}`);

  const [hero, onSale, featured, newest, subPhotos] = await Promise.all([
    get<PublicBanner[]>('/banners?placement=cakes.hero', []),
    get<Paginated<ProductCard> | null>(q('onSale=true&limit=8'), null),
    get<Paginated<ProductCard> | null>(q('featured=true&limit=8'), null),
    get<Paginated<ProductCard> | null>(q('sort=newest&limit=8'), null),
    // One photo per sub-category for "Most popular creations" when the category has no image.
    Promise.all(subs.slice(0, 4).map((s) => (s.imageUrl ? Promise.resolve(s.imageUrl) : get<Paginated<ProductCard> | null>(`/products?category=${encodeURIComponent(s.slug)}&limit=1`, null).then((r) => r?.items[0]?.images[0] ?? null)))),
  ]);

  const deals = items(onSale).length ? items(onSale) : items(featured).length ? items(featured) : items(newest);
  const spotlightTabs = subs.length ? subs.map((s) => ({ slug: s.slug, name: s.name })) : slug ? [{ slug, name: cake!.name }] : [];
  const spotlightInitial = spotlightTabs[0] ? await get<Paginated<ProductCard> | null>(`/products?category=${encodeURIComponent(spotlightTabs[0].slug)}&limit=10`, null).then(items) : [];

  // Shown until cake banners are uploaded in Admin → Banners ("Cake shop slider").
  const slides: CakeSlide[] = [
    { key: 'love', kicker: 'made with care & love', title: 'cakes for every celebration', cta: 'Shop cakes', href: '/cakes/shop', bg: 'bg-blush' },
    { key: 'custom', kicker: 'birthdays, weddings & naming ceremonies', title: 'your cake, your way', cta: 'Request a quote', href: '/services/request?service=custom-cake', bg: 'bg-sky' },
    { key: 'fresh', kicker: 'baked fresh this week', title: 'cupcakes & pastries', cta: 'See what’s fresh', href: '/cakes/shop?sort=newest', bg: 'bg-butter' },
  ];

  const featureDefaults: Feature[] = [
    { title: 'Cupcakes', text: 'Boxes of cupcakes for parties, offices and gifts, in flavours that change with the season.', href: '/cakes/shop', icon: 'cupcake' },
    { title: 'Wedding cakes', text: 'Tiered cakes designed with you, from a quiet registry lunch to a full reception.', href: '/services/request?service=custom-cake', icon: 'tiered' },
    { title: 'Party cakes', text: 'Birthday and naming-ceremony cakes in your theme, ready for pickup or delivered.', href: '/services/request?service=custom-cake', icon: 'party' },
  ];
  const icons: Feature['icon'][] = ['cupcake', 'tiered', 'party'];
  const features: Feature[] = subs.length >= 3
    ? subs.slice(0, 3).map((s, n) => ({ title: s.name, text: s.description ?? featureDefaults[n].text, href: `/cakes/shop?category=${s.slug}`, icon: icons[n] }))
    : featureDefaults;

  const creations: Creation[] = subs.slice(0, 4).map((s, n) => ({ slug: s.slug, name: s.name, text: s.description ?? `Browse our ${s.name.toLowerCase()}.`, image: subPhotos[n] ?? null }));

  return (
    <>
      <h1 className="sr-only">{cake?.name ?? 'Cakes'}</h1>
      <CakeHero banners={hero} slides={slides} />
      <FeatureBand features={features} />
      <Creations items={creations} />
      <BestDeals products={deals.slice(0, 5)} />
      <LayerSpotlight title={subs.length ? 'Find your cake' : cake?.name ?? 'Our cakes'} tabs={spotlightTabs} initial={spotlightInitial} />
      <FlavourTiles products={items(featured).length ? items(featured) : items(newest)} />
      <CakeGrid title="Fresh from the oven" products={items(newest)} allHref="/cakes/shop" />
      <CakeNewsletter />
    </>
  );
}
