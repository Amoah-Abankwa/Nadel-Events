import Link from 'next/link';
import { CategoryIcon, IconChevronDown, IconMenu, IconSearch } from '@/components/icons/Icons';
import { siteConfig } from '@/lib/config';
import { DEPARTMENTS, departmentHref, findDepartment, type Department } from '@/lib/departments';
import type { Category } from '@/lib/types';
import { CartPill, TopBarLinks } from './HeaderActions';

/** Three-tier store header: utility bar, brand band with search and cart, then the main menu. */
export function Header({ categories }: { categories: Category[] }) {
  // The three departments lead the menu, matched by slug so renamed categories still work.
  const departments = (['cakes', 'decor', 'kitchen'] as const)
    .map((d) => ({ d, c: findDepartment(categories, d) }))
    .filter((x): x is { d: Department; c: Category } => Boolean(x.c));
  const menu = [
    { href: '/', label: 'Home' },
    ...(departments.length ? departments.map(({ d, c }) => ({ href: departmentHref(d, c), label: DEPARTMENTS[d].label })) : [{ href: '/shop', label: 'Shop' }]),
    { href: '/specials', label: 'Special offers' },
    { href: '/services', label: 'Custom cakes' },
    { href: '/brands', label: 'Brands' },
    { href: '/contact', label: 'Contact' },
    { href: '/sitemap', label: 'Site map' },
  ];
  const shown = new Set(departments.map(({ c }) => c.id));

  return (
    <header>
      <div className="bg-burgundy-deep text-[13px] text-cream">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2">
          <p className="truncate font-semibold text-caramel">{siteConfig.announcement || 'Delivery across all 16 regions of Ghana'}</p>
          <TopBarLinks />
        </div>
      </div>

      <div className="bg-burgundy">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-5">
          <Link href="/" className="mr-auto shrink-0 leading-none md:mr-0">
            <span className="block font-display text-3xl text-paper">{siteConfig.storeName}</span>
            <span className="mt-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-caramel">{siteConfig.tagline}</span>
          </Link>

          <form action="/shop" role="search" className="order-last flex w-full md:order-none md:flex-1">
            <label htmlFor="site-search" className="sr-only">Search products</label>
            <input id="site-search" name="q" type="search" placeholder="Search cakes, piping tips, cake stands, pots…" className="h-12 w-full min-w-0 rounded-l-sm border-0 bg-paper px-4 text-sm text-charcoal placeholder:text-muted focus-visible:outline-caramel" />
            <button type="submit" className="inline-flex h-12 w-14 shrink-0 items-center justify-center rounded-r-sm bg-charcoal text-paper hover:bg-cocoa" aria-label="Search">
              <IconSearch />
            </button>
          </form>

          <CartPill />
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4">
        <nav aria-label="Main" className="relative -mt-px bg-paper shadow-[0_2px_8px_var(--color-panel-shadow)]">
          <ul className="hidden flex-wrap items-center px-2 md:flex">
            {menu.map((m) => (
              <li key={m.href}>
                <Link href={m.href} className="block px-3 py-4 text-[15px] tracking-wide text-charcoal hover:text-burgundy lg:px-4">{m.label}</Link>
              </li>
            ))}
          </ul>
          <details className="md:hidden">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 font-semibold [&::-webkit-details-marker]:hidden">
              <IconMenu /> Menu <IconChevronDown className="ml-auto size-4" />
            </summary>
            <ul className="border-t border-flour pb-2">
              {menu.map((m) => (
                <li key={m.href}><Link href={m.href} className="block px-4 py-2.5 hover:bg-flour">{m.label}</Link></li>
              ))}
              {categories.filter((c) => !shown.has(c.id)).map((c) => (
                <li key={c.id}>
                  <Link href={`/categories/${c.slug}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-flour">
                    <CategoryIcon slug={c.slug} className="size-5 text-muted" /> {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        </nav>
      </div>
    </header>
  );
}
