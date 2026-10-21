'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { EmptyNotice } from '@/components/store/EmptyNotice';
import { ErrorState } from '@/components/support/ErrorState';
import { Skeleton } from '@/components/support/Skeleton';
import type { ApiError } from '@/lib/api/errors';
import { ordersApi } from '@/lib/api/orders';
import { ORDER_STATUS_LABEL, formatDate, formatMoney } from '@/lib/format';
import type { OrderSummary, Paginated } from '@/lib/types';

export default function OrdersPage() {
  const [data, setData] = useState<Paginated<OrderSummary> | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  const load = () => {
    setError(null);
    ordersApi.mine().then(setData).catch(setError);
  };
  useEffect(load, []);

  return (
    <>
      <h1 className="mb-4 font-sans text-2xl font-normal text-charcoal">Order history</h1>
      {error && <ErrorState message={error.message} onRetry={load} />}
      {!data && !error && <Skeleton className="h-48" />}
      {data && data.items.length === 0 && <EmptyNotice text="You haven’t placed any orders yet." />}
      {data && data.items.length > 0 && (
        <ul className="divide-y divide-flour border-y border-flour">
          {data.items.map((o) => (
            <li key={o.orderNumber}>
              <Link href={`/account/orders/${encodeURIComponent(o.orderNumber)}`} className="grid gap-1 py-5 hover:bg-paper sm:grid-cols-[1fr_auto] sm:items-center">
                <span>
                  <span className="block font-semibold">{o.orderNumber}</span>
                  <span className="block text-sm text-muted">
                    {formatDate(o.placedAt)}. {o.itemCount} {o.itemCount === 1 ? 'item' : 'items'}{o.firstItemName ? `, including ${o.firstItemName}` : ''}.
                  </span>
                </span>
                <span className="text-sm sm:text-right">
                  <span className="block font-semibold">{formatMoney(o.total, o.currency)}</span>
                  <span className="block">{ORDER_STATUS_LABEL[o.status] ?? o.status}, {o.fulfilmentType === 'PICKUP' ? 'pickup' : 'delivery'}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
