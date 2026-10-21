'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from '@/stores/session-store';
import { loginHref } from '@/lib/site-links';

/** Client-side gate for UX only. The API enforces authentication on every request. */
export function useRequireSession() {
  const { user, status, load } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'unknown') void load();
    if (status === 'anonymous') router.replace(loginHref(pathname));
  }, [status, load, router, pathname]);

  return { user, ready: status === 'authenticated' };
}
