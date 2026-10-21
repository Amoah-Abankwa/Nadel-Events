import Link from 'next/link';
import { CategoryIcon } from '@/components/icons/Icons';
import { CategoryPanel } from '@/components/home/CategoryPanel';
import { CategoryTabs } from '@/components/home/CategoryTabs';
import { HeroSlider, type TextSlide } from '@/components/home/HeroSlider';
import { NewsletterBox } from '@/components/home/NewsletterBox';
import { ProductCarousel } from '@/components/home/ProductCarousel';
import { PromoPair, SidebarPromo, WideBanner, type PromoCard } from '@/components/home/Promos';
import { Specials, Stories, TrustStrip, type StoryCard } from '@/components/home/Sections';
import { CompactProductList, DealSpotlight } from '@/components/home/SidebarProducts';
import { Testimonial, type ReviewHighlight } from '@/components/home/Testimonial';
import { serverGet } from '@/lib/api/server';
import type { PublicBanner, PublicGiveaway } from '@/lib/api/marketing';
import type { ServiceOption } from '@/lib/api/requests';
import type { Category, Paginated, ProductCard } from '@/lib/types';
import { departmentHref, findDepartment } from '@/lib/departments';

type Campaign = { slug: string; name: string; endsAt: string | null; headline?: string; body?: string; heroImage?: string | null };

// Every fetch falls back to "nothing", so one slow or failing section never breaks the page.
const get = <T,>(path: string, fallback: T, revalidate = 60) => serverGet<T>(path, revalidate).catch(() => fallback);
const items = (p: Paginated<ProductCard> | null) => p?.items ?? [];
const dateLabel = (iso: string) => new Date(iso).toLocaleDateString('en-GH', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

export default async function HomePage() {
  const categories = await get<Category[]>('/categories', [], 300);
  const firstTab = categories[0]?.slug;

  const [hero, promo, feature, sidebar, featured, onSale, bestsellers, newest, firstTabProducts, highlights, campaigns, giveaways, services] = await Promise.all([
    get<PublicBanner[]>('/banners?placement=home.hero', []),
    get<PublicBanner[]>('/banners?placement=home.promo', []),
    get<PublicBanner[]>('/banners?placement=home.feature', []),
    get<PublicBanner[]>('/banners?placement=home.sidebar', []),
    get<Paginated<ProductCard> | null>('/products?featured=true&limit=12', null),
    get<Paginated<ProductCard> | null>('/products?onSale=true&limit=12', null),
    get<ProductCard[]>('/products/bestsellers?limit=4', []),
    get<Paginated<ProductCard> | null>('/products?sort=newest&limit=12', null),
    firstTab ? get<Paginated<ProductCard> | null>(`/products?category=${encodeURIComponent(firstTab)}&limit=12`, null) : Promise.resolve(null),
    get<ReviewHighlight[]>('/reviews/highlights?limit=1', []),
    get<Campaign[]>('/campaigns/active', []),
    get<PublicGiveaway[]>('/giveaways', []),
    get<{ leadDays: number; services: ServiceOption[] } | null>('/services', null, 300),
  ]);

  const cakes = findDepartment(categories, 'cakes');
  const decor = findDepartment(categories, 'decor');
  const kitchen = findDepartment(categories, 'kitchen');
  const deals = items(onSale).length ? items(onSale) : items(featured);
  const maxReturns = categories.reduce<number | null>((m, c) => (c.returnWindowDays > (m ?? 0) ? c.returnWindowDays : m), null);

  // Shown until the owner uploads banners in Admin → Banners.
  // Background photos live in frontend/public/assets/hero/ and show at 30% opacity behind the text.
  const slides: TextSlide[] = [
    { key: 'cakes', tone: 'cocoa', tag: 'Made to order', title: 'Cakes for every celebration', text: 'Birthdays, weddings and naming ceremonies. Tell us the date and we’ll quote.', cta: 'Request a quote', href: '/services', points: ['Birthdays', 'Weddings', 'Naming ceremonies'], image: '/assets/hero/cakes.jpg' },
    ...(kitchen ? [{ key: 'kitchen', tone: 'flour' as const, tag: 'For your kitchen', title: 'Kitchenware that lasts', text: 'Pots, pans and utensils chosen for everyday cooking.', cta: 'Shop kitchenware', href: `/categories/${kitchen.slug}`, points: ['Cookware', 'Utensils', 'Baking tools'], image: '/assets/hero/kitchenware.jpeg' }] : []),
    ...(decor ? [{ key: 'decor', tone: 'burgundy' as const, tag: 'Party ready', title: 'Decoration for your event', text: 'Cake toppers, table styling and party decoration.', cta: 'Shop decoration', href: departmentHref('decor', decor), points: ['Cake toppers', 'Table styling', 'Party pieces'], image: '/assets/hero/decoration.jpg' }] : []),
  ];
  const promoCards: PromoCard[] = [
    { tag: 'Fresh this week', title: cakes?.name ?? 'Cakes and pastries', text: 'Ready-made cakes and pastries for pickup.', href: departmentHref('cakes', cakes) },
    { tag: 'We care for your kitchen', title: kitchen?.name ?? 'Kitchenware', text: 'Tools and cookware for home bakers and cooks.', href: kitchen ? `/categories/${kitchen.slug}` : '/shop' },
  ];

  const stories: StoryCard[] = [
    ...campaigns.map((c) => ({ key: `c-${c.slug}`, image: c.heroImage ?? null, title: c.headline || c.name, meta: c.endsAt ? `Ends ${dateLabel(c.endsAt)}` : 'Running now', text: c.body ?? '', href: `/promotions/${c.slug}`, cta: 'See the offer' })),
    ...giveaways.filter((g) => g.state !== 'CLOSED').map((g) => ({ key: `g-${g.slug}`, image: g.imageUrl, title: g.title, meta: g.state === 'OPEN' ? `Closes ${dateLabel(g.closesAt)}` : `Opens ${dateLabel(g.opensAt)}`, text: `Prize: ${g.prize}. ${g.description}`, href: `/giveaways/${g.slug}`, cta: 'Enter now' })),
  ];
  const storyFallback: StoryCard[] = (services?.services ?? []).slice(0, 2).map((s) => ({ key: `s-${s.slug}`, image: s.imageUrl, title: s.name, meta: `${services?.leadDays ?? 3} days’ notice`, text: s.description, href: `/services/request?service=${s.slug}`, cta: 'Request a quote' }));

  return (
    <>
      <h1 className="sr-only">Cakes, decoration and kitchenware</h1>

      {/* Phones: quick category chips instead of the sidebar menu. */}
      <nav
        aria-label="Categories"
        className="-mx-4 mb-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden"
      >
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/categories/${c.slug}`}
            className="inline-flex shrink-0 snap-start items-center gap-2 whitespace-nowrap rounded-full border border-crust bg-paper px-3 py-2 text-sm"
          >
            <CategoryIcon slug={c.slug} className="size-4 text-burgundy" /> {c.name}
          </Link>
        ))}
      </nav>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-[16.5rem_minmax(0,1fr)]">
        {/* Phones: one column. Tablets: two columns. Desktop: the stacked sidebar. */}
        <aside
          className="order-2 grid min-w-0 gap-4 sm:grid-cols-2 sm:gap-6 lg:order-1 lg:block lg:space-y-6"
          aria-label="Deals and more"
        >
          <div className="hidden lg:block"><CategoryPanel categories={categories} /></div>
          <DealSpotlight products={deals.slice(0, 6)} />
          <CompactProductList id="bestsellers" title="Best sellers" products={bestsellers} />
          <CompactProductList id="new-in" title="New in" products={items(newest).slice(0, 3)} />
          <NewsletterBox />
          <Testimonial review={highlights[0]} />
          <SidebarPromo banner={sidebar[0]} fallback={{ title: 'Custom cakes', text: 'Made for your day', tag: 'Request a quote', href: '/services' }} />
        </aside>

        <div className="order-1 min-w-0 space-y-4 sm:space-y-6 lg:order-2">
          <HeroSlider banners={hero} fallback={slides} />
          <PromoPair banners={promo} fallback={promoCards} />
          <CategoryTabs categories={categories} initial={items(firstTabProducts)} />
          <ProductCarousel id="featured" title="Featured" products={items(featured)} />
          <WideBanner banner={feature[0]} fallback={{ title: 'Delivered across Ghana', text: 'All 16 regions, or pick up for free', tag: 'Delivery details', href: '/delivery' }} />
          <Specials products={items(onSale).slice(0, 6)} />
          <Stories title={stories.length ? 'Offers and giveaways' : 'Made to order'} cards={stories.length ? stories : storyFallback} />
          <ProductCarousel id="new-arrivals" title="New arrivals" products={items(newest)} />
        </div>
      </div>

      <div className="mt-6 sm:mt-8"><TrustStrip returnsDays={maxReturns} /></div>
    </>
  );
}