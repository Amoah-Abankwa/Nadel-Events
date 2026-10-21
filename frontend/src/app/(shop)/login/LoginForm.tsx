'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Breadcrumbs } from '@/components/store/Breadcrumbs';
import { authApi } from '@/lib/api/auth';
import type { ApiError } from '@/lib/api/errors';
import { safeNext } from '@/lib/format';
import { useSession } from '@/stores/session-store';

const box = 'rounded-sm border border-flour bg-paper p-6 shadow-[0_1px_6px_var(--color-panel-shadow)] sm:p-8';

/** "New customer" and "Returning customer" side by side, as in the reference. */
export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next'), '/account/orders');
  const fromCheckout = next.startsWith('/checkout');
  const setUser = useSession((s) => s.setUser);
  const [error, setError] = useState<ApiError | null>(null);
  const [pending, setPending] = useState(false);
  const registerHref = `/register${params.get('next') ? `?next=${encodeURIComponent(next)}` : ''}`;

  return (
    <div className="mx-auto max-w-5xl">
      <Breadcrumbs items={[{ label: 'Account', href: '/account/orders' }, { label: 'Login' }]} />
      {fromCheckout && <p className="mb-4 rounded-sm bg-flour px-4 py-3 text-sm">Sign in or create an account to place your order. Your cart is saved.</p>}
      <div className="grid gap-6 md:grid-cols-2">
        <section aria-labelledby="new-h" className={box}>
          <h1 id="new-h" className="font-sans text-3xl font-normal text-charcoal">New customer</h1>
          <p className="mt-3 font-semibold">Register</p>
          <p className="mt-1 text-[15px]">With an account you check out faster, follow your orders and custom-cake requests, save items for later and keep your delivery addresses.</p>
          <Link href={registerHref} className="btn btn-primary mt-5">Continue</Link>
        </section>

        <section aria-labelledby="returning-h" className={box}>
          <h2 id="returning-h" className="font-sans text-3xl font-normal text-charcoal">Returning customer</h2>
          <p className="mt-3 font-semibold">I am a returning customer</p>
          <form
            className="mt-3 space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              setError(null);
              setPending(true);
              const f = new FormData(e.currentTarget);
              try {
                const user = await authApi.login(String(f.get('email')), String(f.get('password')));
                setUser(user);
                router.replace(params.get('next') ? next : user.role !== 'CUSTOMER' ? '/admin' : next);
              } catch (err) {
                setError(err as ApiError);
                setPending(false);
              }
            }}
          >
            <div>
              <label htmlFor="email" className="mb-1 block text-[15px]">Email address</label>
              <input id="email" name="email" type="email" autoComplete="email" placeholder="Email address" required className="field" />
            </div>
            <div>
              <label htmlFor="password" className="mb-1 block text-[15px]">Password</label>
              <input id="password" name="password" type="password" autoComplete="current-password" placeholder="Password" required className="field" />
              <Link href="/forgot-password" className="mt-1 inline-block text-[15px] hover:text-burgundy">Forgotten password</Link>
            </div>
            {error && <p role="alert" className="text-sm text-danger">{error.message}</p>}
            <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? 'Signing in…' : 'Login'}</button>
          </form>
        </section>
      </div>
    </div>
  );
}
