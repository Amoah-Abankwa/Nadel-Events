'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ErrorState } from '@/components/support/ErrorState';
import { Skeleton } from '@/components/support/Skeleton';
import type { ApiError } from '@/lib/api/errors';
import { ordersApi } from '@/lib/api/orders';
import { ORDER_STATUS_LABEL, formatDate, formatMoney } from '@/lib/format';
import type { OrderDetail } from '@/lib/types';

export default function OrderDetailPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  const load = () => {
    setError(null);
    ordersApi.detail(orderNumber).then(setOrder).catch(setError);
  };
  useEffect(load, [orderNumber]);

  if (error) return <ErrorState message={error.message} onRetry={load} />;
  if (!order) return <Skeleton className="h-64" />;

  const m = (v: string) => formatMoney(v, order.currency);

  return (
    <article>
      <Link href="/account/orders" className="text-sm underline underline-offset-2">All orders</Link>
      <h1 className="mt-4 text-4xl">Order {order.orderNumber}</h1>
      <p className="mt-2 text-muted">Placed {formatDate(order.placedAt)}</p>

      <dl className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="panel p-4"><dt className="text-sm text-muted">Order status</dt><dd className="font-semibold">{ORDER_STATUS_LABEL[order.status] ?? order.status}</dd></div>
        <div className="panel p-4"><dt className="text-sm text-muted">Payment</dt><dd className="font-semibold">{order.paymentStatus === 'SUCCEEDED' ? 'Paid' : order.paymentStatus === 'PENDING' ? 'Awaiting payment' : 'Not paid'}</dd></div>
        <div className="panel p-4"><dt className="text-sm text-muted">Fulfilment</dt><dd className="font-semibold">{order.fulfilmentType === 'PICKUP' ? 'Pickup' : `Delivery${order.deliveryZoneName ? `, ${order.deliveryZoneName}` : ''}`}</dd></div>
      </dl>

      {order.status === 'PENDING_PAYMENT' && (
        <Link href={`/checkout/result?order=${encodeURIComponent(order.orderNumber)}`} className="btn btn-primary mt-6">Complete payment</Link>
      )}

      <section aria-labelledby="items-heading" className="mt-10">
        <h2 id="items-heading" className="text-2xl">Items</h2>
        <ul className="mt-4 divide-y divide-flour border-y border-flour">
          {order.items.map((i) => (
            <li key={i.sku} className="flex justify-between gap-4 py-3 text-sm">
              <span>{i.productName}{i.variantName !== 'Standard' ? ` (${i.variantName})` : ''} × {i.quantity}</span>
              <span>{m(i.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <dl className="ml-auto mt-4 max-w-xs space-y-1 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{m(order.subtotal)}</dd></div>
          {Number(order.discountTotal) > 0 && <div className="flex justify-between"><dt>Discount</dt><dd>−{m(order.discountTotal)}</dd></div>}
          <div className="flex justify-between"><dt>{order.fulfilmentType === 'PICKUP' ? 'Pickup' : 'Delivery'}</dt><dd>{m(order.deliveryFee)}</dd></div>
          {!order.pricesIncludeTax && order.taxLines.filter((t) => Number(t.amount) > 0).map((t) => (
            <div key={t.name} className="flex justify-between"><dt>{t.name} ({t.ratePercent}%)</dt><dd>{m(t.amount)}</dd></div>
          ))}
          <div className="flex justify-between border-t border-flour pt-2 text-base font-semibold"><dt>Total</dt><dd>{m(order.total)}</dd></div>
          {order.pricesIncludeTax && Number(order.taxTotal) > 0 && <p className="text-muted">Includes tax of {m(order.taxTotal)}.</p>}
        </dl>
      </section>

      <section aria-labelledby="returns-heading" className="mt-10">
        <h2 id="returns-heading" className="text-2xl">Returns</h2>
        {!order.completedAt ? (
          <p className="mt-3 text-sm text-muted">The returns period starts when you receive your order.</p>
        ) : (
          <ul className="mt-3 space-y-1 text-sm">
            {order.items.map((i) => (
              <li key={i.sku}>
                {i.productName}:{' '}
                {i.returnWindowDays === 0
                  ? 'not returnable'
                  : i.returnable
                    ? `returnable until ${formatDate(i.returnDeadline!)}`
                    : `return period ended ${formatDate(i.returnDeadline!)}`}
              </li>
            ))}
          </ul>
        )}
        {order.items.some((i) => i.returnable) && (
          <p className="mt-3 text-sm">To start a return, message us on WhatsApp with order number {order.orderNumber}.</p>
        )}
      </section>

      {order.shippingAddress && (
        <section aria-labelledby="addr-heading" className="mt-10">
          <h2 id="addr-heading" className="text-2xl">Delivery address</h2>
          <address className="mt-3 not-italic text-sm leading-relaxed">
            {order.shippingAddress.recipientName}<br />
            {order.shippingAddress.addressLine}<br />
            {order.shippingAddress.area}, {order.shippingAddress.city}<br />
            {order.shippingAddress.phone}
          </address>
        </section>
      )}

      <section aria-labelledby="history-heading" className="mt-10">
        <h2 id="history-heading" className="text-2xl">History</h2>
        <ol className="mt-3 space-y-1 text-sm">
          {order.history.map((h, i) => (
            <li key={i}>{formatDate(h.at)}: {ORDER_STATUS_LABEL[h.status] ?? h.status}</li>
          ))}
        </ol>
      </section>
    </article>
  );
}
