'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { IconMenu, IconSearch } from '@/components/icons/Icons';
import { cartCount, useCart } from '@/stores/cart-store';
import { useHydrated } from '@/hooks/use-hydrated';
import { Wordmark } from './Bits';

/** White header: script wordmark, condensed uppercase menu with an underline on the current item, cart and search. */
export function DecorHeader({ decorSlug }: { decorSlug: string | null }) {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const count = useCart((s) => cartCount(s.items));
  const [search, setSearch] = useState(false);
  const [menu, setMenu] = useState(false);
  const shop = '/decor/shop';
  const nav = [
    { href: '/decor', label: 'Home' },
    { href: shop, label: 'Shop' },
    { href: '/services/request?service=event-decoration', label: 'Event styling' },
    { href: '/promotions', label: 'Offers' },
    { href: '/contact', label: 'Contacts' },
    { href: '/', label: 'Main shop' },
  ];
  const link = (n: { href: string; label: string }, mobile = false) => {
    const active = n.href === '/decor' ? pathname === '/decor' : n.href === '/decor/shop' ? pathname.startsWith('/decor/shop') || pathname.startsWith('/decor/products') : false;
    return (
      <Link key={n.href} href={n.href} onClick={() => setMenu(false)} aria-current={active ? 'page' : undefined}
        className={`relative font-condensed uppercase tracking-[0.12em] text-charcoal hover:text-taupe ${mobile ? 'block px-4 py-3 text-base' : 'px-2.5 py-2 text-[15px] after:absolute after:inset-x-0 after:-bottom-1 after:mx-auto after:h-0.5 after:w-6 after:bg-charcoal after:opacity-0 aria-[current=page]:after:opacity-100'}`}>
        {n.label}
      </Link>
    );
  };

  return (
    <header className="bg-paper">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-6 lg:py-8">
        <Link href="/decor" aria-label="Decoration studio home"><Wordmark /></Link>
        <nav aria-label="Decoration studio" className="hidden lg:block"><div className="flex gap-3">{nav.map((n) => link(n))}</div></nav>
        <div className="flex items-center gap-4 text-charcoal">
          <Link href="/cart" className="inline-flex items-center gap-2 hover:text-taupe" aria-label={`Cart, ${hydrated ? count : 0} items`}>
            <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 4h2l2.2 10.5h10.6L20 7H7" /><circle cx="9.5" cy="19" r="1.3" /><circle cx="17" cy="19" r="1.3" /></svg>
            <span className="font-condensed text-sm">{hydrated ? count : 0}</span>
          </Link>
          <button type="button" onClick={() => setSearch(!search)} aria-expanded={search} aria-controls="decor-search" aria-label="Search decoration" className="hover:text-taupe"><IconSearch className="size-5" /></button>
          <button type="button" onClick={() => setMenu(!menu)} aria-expanded={menu} aria-controls="decor-menu" aria-label="Menu" className="lg:hidden"><IconMenu className="size-6" /></button>
        </div>
      </div>
      {search && (
        <form id="decor-search" action={shop} role="search" className="mx-auto flex max-w-xl px-6 pb-6">
          <label htmlFor="dq" className="sr-only">Search decoration</label>
          <input id="dq" name="q" type="search" autoFocus placeholder="Search balloons, cake toppers, table décor…" className="h-12 flex-1 border border-petal-deep px-4" />
          <button type="submit" className="border border-charcoal bg-paper px-5 font-condensed uppercase tracking-widest">Search</button>
        </form>
      )}
      {menu && <nav id="decor-menu" aria-label="Decoration studio" className="border-t border-petal-deep pb-3 lg:hidden">{nav.map((n) => link(n, true))}</nav>}
    </header>
  );
}
