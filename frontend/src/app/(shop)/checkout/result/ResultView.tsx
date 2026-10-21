'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ErrorState } from '@/components/support/ErrorState';
import { Skeleton } from '@/components/support/Skeleton';
import { PENDING_ORDER_KEY } from '@/components/checkout/CheckoutView';
import type { ApiError } from '@/lib/api/errors';
import { ordersApi } from '@/lib/api/orders';
import { formatMoney } from '@/lib/format';
import type { OrderStatusView } from '@/lib/types';
import { useRequireSession } from '@/hooks/use-require-session';
import { useCart } from '@/stores/cart-store';
import { RelatedProducts } from '@/components/product/RelatedProducts';

const POLL_MS = 3000;

function useCountdown(until: string | null | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!until) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [until]);
  if (!until) return null;
  const ms = Math.max(0, new Date(until).getTime() - now);
  return { ms, label: `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}` };
}
const MAX_POLLS = 40; // ~2 minutes

/** Status always comes from the API (which verifies with the provider); URL params are never trusted. */
export function ResultView() {
  const params = useSearchParams();
  const router = useRouter();
  const orderNumber = params.get('order');
  const { ready } = useRequireSession();
  const clearCart = useCart((s) => s.clear);
  const mergeLines = useCart((s) => s.mergeLines);

  const [order, setOrder] = useState<OrderStatusView | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const polls = useRef(0);
  const countdown = useCountdown(order?.status === 'PENDING_PAYMENT' ? order.reservationExpiresAt : null);

  const load = useCallback(async () => {
    if (!orderNumber) return;
    try {
      const o = await ordersApi.status(orderNumber);
      setOrder(o);
      setError(null);
      if (o.status === 'PAID' || o.paymentStatus === 'SUCCEEDED') {
        if (sessionStorage.getItem(PENDING_ORDER_KEY) === o.orderNumber) {
          clearCart();
          sessionStorage.removeItem(PENDING_ORDER_KEY);
        }
      }
    } catch (e) {
      setError(e as ApiError);
    }
  }, [orderNumber, clearCart]);

  useEffect(() => {
    if (!ready) return;
    void load();
  }, [ready, load]);

  useEffect(() => {
    if (order?.status !== 'PENDING_PAYMENT' || polls.current >= MAX_POLLS) return;
    const t = setTimeout(() => {
      polls.current += 1;
      void load();
    }, POLL_MS);
    return () => clearTimeout(t);
  }, [order, load]);

  if (!orderNumber) return <ErrorState message="No order was specified." />;
  if (error) return <ErrorState message={error.message} onRetry={load} />;
  if (!order) return <Skeleton className="h-48" />;

  async function payNow() {
    setBusy(true);
    try {
      const p = await ordersApi.pay(order!.orderNumber);
      window.location.assign(p.checkoutUrl);
    } catch (e) {
      setError(e as ApiError);
      setBusy(false);
    }
  }

  async function reorder() {
    setBusy(true);
    try {
      const r = await ordersApi.reorder(order!.orderNumber);
      mergeLines(r.lines);
      router.push('/cart');
    } catch (e) {
      setError(e as ApiError);
      setBusy(false);
    }
  }

  const total = formatMoney(order.total, order.currency);

  if (order.serviceRequestReference && order.paymentStatus === 'SUCCEEDED') {
    return (
      <div className="panel p-8">
        <h1 className="text-4xl">Deposit paid: you’re booked</h1>
        <p className="mt-4 text-lg">We received your {total} deposit for request <strong>{order.serviceRequestReference}</strong>.</p>
        <p className="mt-2 text-muted">A receipt is on its way to your email.</p>
        <Link href={`/account/requests/${order.serviceRequestReference}`} className="btn btn-primary mt-8">View your booking</Link>
      </div>
    );
  }

  if (order.status === 'PAID' || order.paymentStatus === 'SUCCEEDED') {
    return (
      <>
      <div className="panel p-8">
        <h1 className="text-4xl">Payment confirmed</h1>
        <p className="mt-4 text-lg">Thank you. Order <strong>{order.orderNumber}</strong> is paid ({total}).</p>
        <p className="mt-2 text-muted">
          A receipt is on its way to your email. {order.fulfilmentType === 'PICKUP' ? 'We’ll let you know when it’s ready for pickup.' : 'We’ll let you know when it’s out for delivery.'}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={`/account/orders/${encodeURIComponent(order.orderNumber)}`} className="btn btn-primary">View order</Link>
          <Link href="/shop" className="btn btn-secondary">Keep shopping</Link>
        </div>
      </div>
      <RelatedProducts title="You might also need" />
      </>
    );
  }

  if (order.status === 'PENDING_PAYMENT') {
    const cancelled = params.get('cancelled') === '1';
    return (
      <div className="panel p-8">
        <h1 className="text-4xl">{cancelled ? 'Payment not completed' : 'Confirming your payment'}</h1>
        <p className="mt-4">Order <strong>{order.orderNumber}</strong> ({total}) is waiting for payment. It is not paid yet.</p>
        {!cancelled && polls.current < MAX_POLLS && <p role="status" className="mt-2 text-muted">Checking with the payment provider…</p>}
        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" className="btn btn-primary" onClick={payNow} disabled={busy}>Pay now</button>
          <button type="button" className="btn btn-secondary" onClick={() => { polls.current = 0; void load(); }} disabled={busy}>Check again</button>
        </div>
        {countdown && (
          <p className="mt-6 text-sm" role="timer" aria-live="off">
            {countdown.ms > 0 ? <>Your items are held for <strong>{countdown.label}</strong> more. After that the order is released.</> : 'The payment window has closed.'}
          </p>
        )}
        <p className="mt-2 text-sm text-muted">Your cart is still saved.</p>
      </div>
    );
  }

  return (
    <div className="panel p-8">
      <h1 className="text-4xl">{order.status === 'PAYMENT_FAILED' ? 'Payment didn’t go through' : order.status === 'EXPIRED' ? 'Payment window closed' : 'Order cancelled'}</h1>
      <p className="mt-4">Order <strong>{order.orderNumber}</strong> was not paid, and you have not been charged by us. Your cart is still saved.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        {order.serviceRequestReference ? (
          <Link href={`/account/requests/${order.serviceRequestReference}`} className="btn btn-primary">Back to your request</Link>
        ) : (
          <>
            <Link href="/checkout" className="btn btn-primary">Return to checkout</Link>
            <button type="button" className="btn btn-secondary" onClick={reorder} disabled={busy}>Add these items to my cart</button>
          </>
        )}
      </div>
    </div>
  );
}
