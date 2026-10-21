'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Skeleton } from '@/components/support/Skeleton';
import { Breadcrumbs } from '@/components/store/Breadcrumbs';
import { useRequireSession } from '@/hooks/use-require-session';
import { useSession } from '@/stores/session-store';

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const { user, ready } = useRequireSession();
  const logout = useSession((s) => s.logout);
  const router = useRouter();
  const pathname = usePathname();

  if (!ready) return <Skeleton className="h-64" />;

  const NAV: [string, string][] = [
    ['/account/orders', 'Order history'],
    ['/account/requests', 'Cake and event requests'],
    ['/account/wishlist', 'My wish list'],
    ['/account/addresses', 'Address book'],
    ['/account/profile', 'My details'],
  ];
  const current = NAV.find(([href]) => pathname.startsWith(href));
  const isDetail = current && pathname !== current[0];
  const crumbs = [
    { label: 'Account', href: '/account/orders' },
    ...(current ? [{ label: current[1], href: current[0] }] : []),
    ...(isDetail ? [{ label: decodeURIComponent(pathname.split('/').pop() ?? '') }] : []),
  ];

  return (
    <>
    <Breadcrumbs items={crumbs} />
    <div className="grid gap-8 md:grid-cols-[14rem_1fr]">
      <aside className="h-fit bg-paper p-5 shadow-[0_1px_6px_var(--color-panel-shadow)]">
        <p className="font-display text-xl text-cocoa">{user?.name}</p>
        <p className="text-sm text-muted">{user?.email}</p>
        <nav aria-label="Account" className="mt-6 space-y-1 text-sm">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} aria-current={pathname.startsWith(href) ? 'page' : undefined} className="block rounded-sm px-2 py-2 hover:bg-flour aria-[current=page]:bg-flour aria-[current=page]:font-semibold">
              {label}
            </Link>
          ))}
          <button type="button" onClick={async () => { await logout(); router.replace('/'); }} className="block w-full rounded-sm px-2 py-2 text-left hover:bg-flour">
            Sign out
          </button>
        </nav>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
    </>
  );
}
