import Link from 'next/link';
import { IconClock, IconMail, IconPhone, IconPin } from '@/components/icons/Icons';
import { siteConfig } from '@/lib/config';
import { POLICY_LINKS, SUPPORT_LINKS } from '@/lib/site-links';

const COLUMNS = [
  {
    title: 'Shop',
    links: [
      { href: '/cakes', label: 'Cake shop' },
      { href: '/decor', label: 'Decoration studio' },
      { href: '/categories/kitchenware', label: 'Kitchenware' },
      { href: '/specials', label: 'Special offers' },
      { href: '/brands', label: 'Brands' },
      { href: '/services', label: 'Custom cakes and events' },
      { href: '/giveaways', label: 'Giveaways' },
    ],
  },
  {
    title: 'Information',
    links: [...POLICY_LINKS, ...SUPPORT_LINKS],
  },
  {
    title: 'My account',
    links: [
      { href: '/account/orders', label: 'Order history' },
      { href: '/account/requests', label: 'Cake and event requests' },
      { href: '/account/wishlist', label: 'Saved items' },
      { href: '/account/addresses', label: 'Addresses' },
      { href: '/account/profile', label: 'My details' },
    ],
  },
];

const Heading = ({ children }: { children: React.ReactNode }) => (
  <h2 className="font-sans text-base font-semibold uppercase tracking-wide text-paper after:mt-2 after:block after:h-0.5 after:w-8 after:bg-caramel">{children}</h2>
);

export function Footer() {
  return (
    <footer className="mt-16 bg-charcoal text-[15px] text-cream/80">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <Heading>{col.title}</Heading>
            <ul className="mt-4 space-y-2">
              {col.links.map((l) => <li key={l.href}><Link href={l.href} className="hover:text-caramel">{l.label}</Link></li>)}
            </ul>
          </nav>
        ))}
        <div>
          <Heading>Contact us</Heading>
          <ul className="mt-4 space-y-2.5">
            {siteConfig.pickupAddress && <li className="flex gap-3"><IconPin className="mt-0.5 size-4 shrink-0 text-caramel" />{siteConfig.pickupAddress}</li>}
            {siteConfig.contactEmail && <li className="flex gap-3"><IconMail className="mt-0.5 size-4 shrink-0 text-caramel" /><a href={`mailto:${siteConfig.contactEmail}`} className="hover:text-caramel">{siteConfig.contactEmail}</a></li>}
            {siteConfig.contactPhone && <li className="flex gap-3"><IconPhone className="mt-0.5 size-4 shrink-0 text-caramel" /><a href={`tel:${siteConfig.contactPhone.replace(/\s/g, '')}`} className="hover:text-caramel">{siteConfig.contactPhone}</a></li>}
          </ul>
          {siteConfig.pickupHours && (
            <>
              <h3 className="mt-6 font-sans text-sm font-semibold uppercase tracking-wide text-paper">Opening hours</h3>
              <p className="mt-2 flex gap-3"><IconClock className="mt-0.5 size-4 shrink-0 text-caramel" />{siteConfig.pickupHours}</p>
            </>
          )}
        </div>
      </div>
      <div className="border-t border-cream/10 bg-black/20">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 text-sm">
          <p>© {new Date().getFullYear()} {siteConfig.storeName}. All rights reserved.</p>
          <ul aria-label="Ways to pay" className="flex flex-wrap gap-2 text-xs font-semibold">
            {['Mobile Money', 'Visa', 'Mastercard'].map((m) => <li key={m} className="rounded-sm border border-cream/25 px-2 py-1 text-cream">{m}</li>)}
          </ul>
        </div>
      </div>
    </footer>
  );
}
