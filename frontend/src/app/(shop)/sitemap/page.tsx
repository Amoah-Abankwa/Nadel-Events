import type { Metadata } from 'next';
import Link from 'next/link';
import { StoreColumns } from '@/components/store/StoreColumns';
import { serverGet } from '@/lib/api/server';
import type { Category } from '@/lib/types';

export const metadata: Metadata = { title: 'Site map' };

function Tree({ items }: { items: Category[] }) {
  return (
    <ul className="ml-4 list-disc space-y-1 marker:text-crust">
      {items.map((c) => (
        <li key={c.id}>
          <Link href={`/categories/${c.slug}`} className="hover:text-burgundy">{c.name}</Link>
          {c.children.length > 0 && <Tree items={c.children} />}
        </li>
      ))}
    </ul>
  );
}

const Links = ({ title, links }: { title: string; links: [string, string][] }) => (
  <section>
    <h2 className="font-sans text-lg font-semibold text-charcoal">{title}</h2>
    <ul className="ml-4 mt-2 list-disc space-y-1 marker:text-crust">
      {links.map(([href, label]) => <li key={href}><Link href={href} className="hover:text-burgundy">{label}</Link></li>)}
    </ul>
  </section>
);

export default async function SitemapPage() {
  const categories = await serverGet<Category[]>('/categories', 300).catch(() => [] as Category[]);
  return (
    <StoreColumns crumbs={[{ label: 'Site map' }]}>
      <h1 className="font-sans text-2xl font-normal text-charcoal">Site map</h1>
      <div className="mt-5 grid gap-8 bg-paper p-6 shadow-[0_1px_6px_var(--color-panel-shadow)] sm:grid-cols-2">
        <section>
          <h2 className="font-sans text-lg font-semibold text-charcoal">Shop</h2>
          <div className="mt-2"><Tree items={categories} /></div>
          <ul className="ml-4 mt-1 list-disc space-y-1 marker:text-crust">
            <li><Link href="/shop" className="hover:text-burgundy">All products</Link></li>
            <li><Link href="/specials" className="hover:text-burgundy">Special offers</Link></li>
            <li><Link href="/brands" className="hover:text-burgundy">Brands</Link></li>
          </ul>
        </section>
        <div className="space-y-6">
          <Links title="Custom cakes and events" links={[['/cakes', 'Cake shop'], ['/services', 'What we make'], ['/services/request', 'Request a quote'], ['/promotions', 'Promotions'], ['/giveaways', 'Giveaways']]} />
          <Links title="My account" links={[['/account/orders', 'Order history'], ['/account/requests', 'Cake and event requests'], ['/account/wishlist', 'Saved items'], ['/account/addresses', 'Addresses'], ['/account/profile', 'My details'], ['/cart', 'Shopping cart'], ['/checkout', 'Checkout']]} />
          <Links title="Information" links={[['/delivery', 'Delivery and pickup'], ['/returns', 'Returns and refunds'], ['/privacy', 'Privacy policy'], ['/terms', 'Terms and conditions'], ['/contact', 'Contact us']]} />
        </div>
      </div>
    </StoreColumns>
  );
}
