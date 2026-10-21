'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { Role } from '@/lib/api/admin';
import { siteConfig } from '@/lib/config';
import type { User } from '@/lib/types';
import { useSession } from '@/stores/session-store';
import { AUTH_ROUTES } from '@/lib/site-links';

type NavItem = { href: string; label: string; roles: Role[] };

const GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Daily',
    items: [
      { href: '/admin', label: 'Overview', roles: ['ADMIN', 'FULFILMENT'] },
      { href: '/admin/orders', label: 'Orders', roles: ['ADMIN', 'FULFILMENT'] },
      { href: '/admin/requests', label: 'Cake and event requests', roles: ['ADMIN', 'FULFILMENT'] },
  { href: '/admin/messages', label: 'Messages', roles: ['ADMIN', 'FULFILMENT'] },
      { href: '/admin/reviews', label: 'Reviews', roles: ['ADMIN', 'MARKETING'] },
    ],
  },
  {
    label: 'Shop',
    items: [
      { href: '/admin/products', label: 'Products and stock', roles: ['ADMIN'] },
      { href: '/admin/categories', label: 'Categories and returns', roles: ['ADMIN'] },
      { href: '/admin/services', label: 'Services', roles: ['ADMIN'] },
      { href: '/admin/delivery', label: 'Delivery fees', roles: ['ADMIN'] },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { href: '/admin/coupons', label: 'Coupons', roles: ['ADMIN', 'MARKETING'] },
  { href: '/admin/newsletter', label: 'Newsletter', roles: ['ADMIN', 'MARKETING'] },
      { href: '/admin/banners', label: 'Banners and ad spots', roles: ['ADMIN', 'MARKETING'] },
      { href: '/admin/campaigns', label: 'Campaign pages', roles: ['ADMIN', 'MARKETING'] },
      { href: '/admin/giveaways', label: 'Giveaways', roles: ['ADMIN', 'MARKETING'] },
    ],
  },
  {
    label: 'Business',
    items: [
      { href: '/admin/reports', label: 'Reports', roles: ['ADMIN'] },
      { href: '/admin/settings', label: 'Tax and settings', roles: ['ADMIN'] },
      { href: '/admin/staff', label: 'Staff', roles: ['ADMIN'] },
      { href: '/admin/activity', label: 'Activity log', roles: ['ADMIN'] },
      { href: '/admin/notifications', label: 'Failed messages', roles: ['ADMIN'] },
    ],
  },
];
const NAV = GROUPS.flatMap((g) => g.items);

export const canSee = (role: Role, href: string) => NAV.find((n) => n.href === href)?.roles.includes(role) ?? role === 'ADMIN';

export function AdminShell({ user, children }: { user: User; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useSession((s) => s.logout);
  const groups = GROUPS.map((g) => ({ ...g, items: g.items.filter((n) => n.roles.includes(user.role)) })).filter((g) => g.items.length);
  const isActive = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname.startsWith(href));

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_1fr]">
      <aside className="border-b border-flour bg-paper md:min-h-dvh md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-5 py-4 md:block">
          <Link href="/admin" className="font-display text-xl text-burgundy">{siteConfig.storeName}</Link>
          <p className="text-xs text-muted md:mt-1">Store admin</p>
        </div>
        <nav aria-label="Admin" className="overflow-x-auto px-3 pb-3 md:pb-6">
          <div className="flex gap-1 md:block md:space-y-4">
            {groups.map((g) => (
              <div key={g.label} className="flex gap-1 md:block">
                <p className="hidden px-3 pb-1 text-xs text-muted md:block">{g.label}</p>
                <ul className="flex gap-1 md:block md:space-y-0.5">
                  {g.items.map((n) => (
                    <li key={n.href}>
                      <Link
                        href={n.href}
                        aria-current={isActive(n.href) ? 'page' : undefined}
                        className="block whitespace-nowrap rounded-sm border-l-2 border-transparent px-3 py-1.5 text-sm hover:bg-flour aria-[current=page]:border-burgundy aria-[current=page]:bg-flour aria-[current=page]:font-semibold"
                      >
                        {n.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </nav>
        <div className="hidden border-t border-flour px-5 py-4 text-sm md:block">
          <p className="font-semibold">{user.name}</p>
          <p className="text-xs text-muted">{user.role.toLowerCase()}</p>
          <div className="mt-3 flex gap-3">
            <Link href="/" className="underline underline-offset-2">View shop</Link>
            <button type="button" className="underline underline-offset-2" onClick={async () => { await logout(); router.replace(AUTH_ROUTES.login); }}>Sign out</button>
          </div>
        </div>
      </aside>
      <main id="main" className="min-w-0 px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
