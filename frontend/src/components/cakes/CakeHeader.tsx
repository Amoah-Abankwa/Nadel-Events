'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import type { Category } from '@/lib/types';
import { MenuDrawer } from './MenuDrawer';
import { CartPill } from '@/components/layout/HeaderActions';
import { IconMenu, IconSearch, IconUser } from '@/components/icons/Icons';
import { siteConfig } from '@/lib/config';
import { useSession } from '@/stores/session-store';
import { IconCupcake, ScallopDisc } from './Shapes';
import { loginHref } from '@/lib/site-links';

/**
 * Ribbon menu with notched ends and a scalloped badge logo, floating over the hero.
 * Search and "Shop" stay inside the cake section. "Menu" opens the slide-out drawer.
 */
export function CakeHeader({ cake }: { cake: Category | null }) {
  const cakeSlug = cake?.slug ?? null;
  const user = useSession((s) => s.user);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const nav = [
    { href: '/cakes', label: 'Home' },
    { href: '/cakes/shop', label: 'Shop' },
    { href: '/services/request?service=custom-cake', label: 'Custom cakes' },
    { href: '/cakes#flavours', label: 'Flavours' },
    { href: '/cakes/contact', label: 'Contact' },
    { href: '/', label: 'Main shop' },
  ];

  return (
    <header className="absolute inset-x-0 top-0 z-30 px-3 pt-4 sm:px-6 sm:pt-8">
      <div className="relative mx-auto max-w-6xl">
        {/* Ribbon: notched ends via clip-path, dashed stitching inside */}
        <div className="bg-rose px-3 py-1.5 text-paper shadow-md [clip-path:polygon(0_0,100%_0,98%_50%,100%_100%,0_100%,2%_50%)] sm:px-6">
          <div className="flex min-h-14 items-center gap-2 border-y-2 border-dashed border-paper/70 pl-24 sm:min-h-16 sm:pl-40">
            <nav aria-label="Cake shop" className="hidden flex-1 lg:block">
              <ul className="flex items-center justify-center gap-1">
                {nav.map((n) => (
                  <li key={n.href}><Link href={n.href} className="block rounded-sm px-3 py-2 text-sm font-bold uppercase tracking-wide hover:bg-paper/15">{n.label}</Link></li>
                ))}
              </ul>
            </nav>
            <div className="ml-auto flex items-center gap-1 sm:gap-3">
              <Link href={user ? '/account/orders' : loginHref()} aria-label={user ? 'My account' : 'Sign in'} className="inline-flex size-10 items-center justify-center rounded-full hover:bg-paper/15"><IconUser /></Link>
              <button type="button" onClick={() => setSearchOpen((o) => !o)} aria-expanded={searchOpen} aria-controls="cake-search" aria-label="Search cakes" className="inline-flex size-10 items-center justify-center rounded-full hover:bg-paper/15"><IconSearch /></button>
              <CartPill cartHref="/cakes/cart" checkoutHref="/cakes/checkout" />
              <button type="button" onClick={() => setMenuOpen(true)} aria-haspopup="dialog" className="inline-flex h-10 items-center gap-2 rounded-full px-3 font-semibold hover:bg-paper/15 lg:hidden"><IconMenu /> Menu</button>
            </div>
          </div>
        </div>

        {/* Scalloped badge logo overlapping the ribbon */}
        <Link href="/cakes" className="absolute -top-2 left-2 sm:-top-5 sm:left-8" aria-label={`${siteConfig.storeName} cakes, home`}>
          <span className="block sm:hidden"><ScallopDisc size={92} fill="var(--color-blush)" ring="var(--color-rose)"><Badge small /></ScallopDisc></span>
          <span className="hidden sm:block"><ScallopDisc size={134} fill="var(--color-blush)" ring="var(--color-rose)"><Badge /></ScallopDisc></span>
        </Link>

        {searchOpen && (
          <form id="cake-search" action="/cakes/shop" role="search" className="mx-auto mt-3 flex max-w-xl bg-paper shadow-lg">
            <label htmlFor="cake-q" className="sr-only">Search cakes</label>
            <input id="cake-q" name="q" type="search" autoFocus placeholder="Search cakes, cupcakes, pastries…" className="h-12 flex-1 px-4 text-charcoal" />
            <button type="submit" className="w-14 bg-rose text-paper" aria-label="Search"><IconSearch className="mx-auto size-5" /></button>
          </form>
        )}
        <MenuDrawer open={menuOpen} onClose={closeMenu} cake={cake} />
      </div>
    </header>
  );
}

function Badge({ small = false }: { small?: boolean }) {
  return (
    <span className="flex flex-col items-center text-rose">
      <IconCupcake className={small ? 'size-8' : 'size-12'} />
      <span className={`font-script leading-none ${small ? 'text-base' : 'text-2xl'}`}>{siteConfig.storeName.split(/\s|&/)[0] || 'Cakes'}</span>
      <span className={`font-bold uppercase tracking-[0.2em] ${small ? 'text-[8px]' : 'text-[10px]'}`}>Cakes</span>
    </span>
  );
}
