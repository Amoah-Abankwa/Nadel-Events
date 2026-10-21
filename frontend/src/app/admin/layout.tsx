'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AdminShell, canSee } from '@/components/admin/AdminShell';
import { Skeleton } from '@/components/support/Skeleton';
import { useRequireSession } from '@/hooks/use-require-session';

/** UX gate only. Every admin endpoint enforces roles on the server. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, ready } = useRequireSession();
  const pathname = usePathname();
  const router = useRouter();

  // Marketing staff have no overview; send them to their screen.
  useEffect(() => {
    if (user?.role === 'MARKETING' && pathname === '/admin') router.replace('/admin/coupons');
  }, [user, pathname, router]);

  if (!ready || !user) return <div className="p-8"><Skeleton className="h-64" /></div>;

  if (user.role === 'CUSTOMER') {
    return (
      <main className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-3xl">No access</h1>
        <p className="mt-3 text-muted">Your account doesn’t have access to the store admin. Ask the owner to give you a staff role.</p>
        <Link href="/" className="btn btn-secondary mt-6">Back to the shop</Link>
      </main>
    );
  }

  const section = '/' + pathname.split('/').slice(1, 3).join('/');
  return (
    <AdminShell user={user}>
      {canSee(user.role, section) ? children : <p className="text-muted">Your role can’t open this page.</p>}
    </AdminShell>
  );
}
