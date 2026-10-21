'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { ErrorState } from '@/components/support/ErrorState';
import type { ApiError } from '@/lib/api/errors';
import { ordersApi } from '@/lib/api/orders';
import { siteConfig } from '@/lib/config';
import { formatMoney, safeNext } from '@/lib/format';
import { useHydrated } from '@/hooks/use-hydrated';

/** Development stand-in for the provider's hosted payment page. */
export function MockPay() {
  const params = useSearchParams();
  const reference = params.get('reference') ?? '';
  const amount = params.get('amount') ?? '0';
  const currency = params.get('currency') ?? siteConfig.currency;
  const hydrated = useHydrated();
  const returnTo = (() => {
    if (typeof window === 'undefined') return '/';
    try {
      const u = new URL(params.get('return') ?? '', window.location.origin);
      return u.origin === window.location.origin ? safeNext(u.pathname + u.search) : '/';
    } catch {
      return '/';
    }
  })();
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  if (!hydrated) return null;
  if (siteConfig.paymentMode !== 'mock') return <ErrorState message="The mock payment page is disabled." />;

  async function complete(outcome: 'SUCCEEDED' | 'FAILED') {
    setBusy(true);
    try {
      await ordersApi.mockComplete(reference, outcome);
      window.location.assign(returnTo);
    } catch (e) {
      setError(e as ApiError);
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md panel p-8">
      <p className="text-sm font-semibold text-danger">Test mode. No real money moves.</p>
      <h1 className="mt-2 text-3xl">Simulated payment</h1>
      <p className="mt-4">Reference {reference}</p>
      <p className="text-2xl font-semibold">{formatMoney(amount, currency)}</p>
      <div className="mt-8 grid gap-3">
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => complete('SUCCEEDED')}>Simulate successful payment</button>
        <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => complete('FAILED')}>Simulate failed payment</button>
        <a href={`${returnTo}${returnTo.includes('?') ? '&' : '?'}cancelled=1`} className="text-center text-sm underline">Cancel and go back</a>
      </div>
      {error && <div className="mt-4"><ErrorState message={error.message} /></div>}
    </div>
  );
}
