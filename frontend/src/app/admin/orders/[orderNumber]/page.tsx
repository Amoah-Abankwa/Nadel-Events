'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { PageHeader, SaveStatus, StatusBadge, Table } from '@/components/admin/ui';
import { ErrorState } from '@/components/support/ErrorState';
import { Skeleton } from '@/components/support/Skeleton';
import { adminApi } from '@/lib/api/admin';
import { ORDER_STATUS_LABEL, formatDate, formatMoney, whatsAppTo } from '@/lib/format';
import { useLoad, useSaver } from '@/hooks/use-load';
import { RefundPanel } from '@/components/admin/orders/RefundPanel';
import { useSession } from '@/stores/session-store';

const ACTION_LABEL: Record<string, string> = {
  PROCESSING: 'Start preparing',
  READY_FOR_PICKUP: 'Mark ready for pickup',
  OUT_FOR_DELIVERY: 'Mark out for delivery',
  DELIVERY_EXCEPTION: 'Report delivery problem',
  COMPLETED: 'Mark completed',
};

export default function AdminOrderPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const isAdmin = useSession((s) => s.user?.role === 'ADMIN');
  const { data: o, error, reload } = useLoad(() => adminApi.order(orderNumber), [orderNumber]);
  const saver = useSaver();
  const [note, setNote] = useState('');

  if (error) return <ErrorState message={error.message} onRetry={reload} />;
  if (!o) return <Skeleton className="h-96" />;

  const m = (v: string) => formatMoney(v, o.currency);
  const act = async (fn: () => Promise<unknown>, msg: string) => {
    if (await saver.run(fn, msg)) {
      setNote('');
      await reload();
    }
  };
  // Customer's number in international format for click-to-chat (Ghana: 0XX… -> 233XX…).
  const chat = whatsAppTo(o.contactPhone, `Hello ${o.contactName}, this is about your order ${o.orderNumber}.`);

  return (
    <>
      <Link href="/admin/orders" className="text-sm underline underline-offset-2">All orders</Link>
      <PageHeader
        title={`Order ${o.orderNumber}`}
        description={`Placed ${formatDate(o.placedAt)}${o.paidAt ? `. Paid ${formatDate(o.paidAt)}` : ''}${o.completedAt ? `. Completed ${formatDate(o.completedAt)}` : ''}.`}
        actions={<StatusBadge status={o.status} />}
      />

      {o.serviceRequest && (
        <p className="mb-6 rounded-md border border-crust bg-paper p-4 text-sm">
          This is a deposit payment for request{' '}
          <Link href={`/admin/requests/${o.serviceRequest.reference}`} className="font-semibold underline">{o.serviceRequest.reference}</Link>.
          Manage the booking from the request.
        </p>
      )}

      {o.needsReconciliation && (
        <div role="alert" className="mb-6 rounded-md border border-danger/40 bg-danger/5 p-4 text-sm">
          <p className="font-semibold text-danger">This order needs a payment check.</p>
          <p className="mt-1">The payment arrived after the order closed, or the amount didn’t match. Confirm in your Hubtel dashboard, then fulfil or refund, and clear the flag.</p>
          {isAdmin && (
            <button type="button" className="btn btn-secondary mt-3" disabled={saver.saving} onClick={() => act(() => adminApi.clearReconciliation(o.orderNumber), 'Flag cleared')}>
              Mark as checked
            </button>
          )}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-8">
          {o.allowedNext.length > 0 && (
            <section aria-labelledby="next" className="panel p-5">
              <h2 id="next" className="text-xl">Update status</h2>
              <div className="mt-3 max-w-md">
                <label htmlFor="note" className="label">Note (optional, staff only)</label>
                <input id="note" className="field" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="e.g. Rider Kofi, 0244 000 000" />
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {o.allowedNext.map((s) => (
                  <button key={s} type="button" disabled={saver.saving}
                    className={`btn ${s === 'DELIVERY_EXCEPTION' ? 'btn-secondary' : 'btn-primary'}`}
                    onClick={() => act(() => adminApi.setOrderStatus(o.orderNumber, s, note || undefined), `Order is now ${ORDER_STATUS_LABEL[s].toLowerCase()}. The customer has been emailed.`)}>
                    {ACTION_LABEL[s] ?? s}
                  </button>
                ))}
                <SaveStatus status={saver.status} message={saver.message} />
              </div>
            </section>
          )}

          <section aria-labelledby="items">
            <h2 id="items" className="mb-3 text-xl">Items</h2>
            <Table caption="Order items">
              <thead><tr><th>Item</th><th>SKU</th><th className="text-right">Qty</th><th className="text-right">Price</th><th className="text-right">Total</th></tr></thead>
              <tbody>
                {o.items.map((i) => (
                  <tr key={i.id}>
                    <td>{i.productName}{i.variantName !== 'Standard' ? ` (${i.variantName})` : ''}</td>
                    <td className="text-muted">{i.sku}</td>
                    <td className="text-right">{i.quantity}</td>
                    <td className="text-right">{m(i.unitPrice)}</td>
                    <td className="text-right">{m(i.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <dl className="ml-auto mt-3 max-w-xs space-y-1 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{m(o.subtotal)}</dd></div>
              {Number(o.discountTotal) > 0 && <div className="flex justify-between"><dt>Discount {o.couponCode && `(${o.couponCode})`}</dt><dd>−{m(o.discountTotal)}</dd></div>}
              <div className="flex justify-between"><dt>{o.fulfilmentType === 'PICKUP' ? 'Pickup' : `Delivery (${o.deliveryZoneName})`}</dt><dd>{m(o.deliveryFee)}</dd></div>
              {(o.taxLines ?? []).map((t) => <div key={t.name} className="flex justify-between"><dt>{t.name} ({t.ratePercent}%)</dt><dd>{m(t.amount)}</dd></div>)}
              <div className="flex justify-between border-t border-flour pt-2 text-base font-semibold"><dt>Total</dt><dd>{m(o.total)}</dd></div>
            </dl>
          </section>

          <section aria-labelledby="payments">
            <h2 id="payments" className="mb-3 text-xl">Payments</h2>
            <Table caption="Payment attempts">
              <thead><tr><th>Reference</th><th>Status</th><th className="text-right">Amount</th><th>Verified</th>{isAdmin && <th />}</tr></thead>
              <tbody>
                {o.payments.map((p) => (
                  <tr key={p.id}>
                    <td className="font-mono text-xs">{p.reference}</td>
                    <td>{p.status.toLowerCase()}{p.failureReason && <span className="block text-xs text-muted">{p.failureReason}</span>}</td>
                    <td className="text-right">{formatMoney(p.amount, p.currency)}</td>
                    <td>{p.verifiedAt ? formatDate(p.verifiedAt) : '—'}</td>
                    {isAdmin && (
                      <td className="text-right">
                        {p.status === 'PENDING' && (
                          <button type="button" className="text-sm underline" disabled={saver.saving} onClick={() => act(() => adminApi.reconcile(p.reference), 'Checked with the payment provider')}>
                            Check with provider
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </Table>
          </section>

          {isAdmin && <RefundPanel orderNumber={o.orderNumber} currency={o.currency} onChanged={reload} />}

          <section aria-labelledby="history">
            <h2 id="history" className="mb-3 text-xl">History</h2>
            <ol className="space-y-2 text-sm">
              {o.history.map((h) => (
                <li key={h.id}>
                  <span className="text-muted">{formatDate(h.createdAt)}</span> {ORDER_STATUS_LABEL[h.to] ?? h.to}
                  {h.note && <span className="text-muted">: {h.note}</span>}
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="space-y-6">
          <section aria-labelledby="customer" className="panel p-5 text-sm">
            <h2 id="customer" className="text-xl">Customer</h2>
            <p className="mt-2 font-semibold">{o.contactName}</p>
            <p><a href={`mailto:${o.contactEmail}`} className="underline">{o.contactEmail}</a></p>
            <p><a href={`tel:${o.contactPhone}`} className="underline">{o.contactPhone}</a></p>
            {chat && <a href={chat} target="_blank" rel="noopener noreferrer" className="btn btn-secondary mt-3 w-full">Message on WhatsApp</a>}
          </section>

          <section aria-labelledby="fulfil" className="panel p-5 text-sm">
            <h2 id="fulfil" className="text-xl">{o.fulfilmentType === 'PICKUP' ? 'Pickup' : 'Delivery'}</h2>
            {o.shippingAddress ? (
              <address className="mt-2 not-italic leading-relaxed">
                {o.shippingAddress.recipientName}, {o.shippingAddress.phone}<br />
                {o.shippingAddress.addressLine}<br />
                {o.shippingAddress.area}, {o.shippingAddress.city}<br />
                {o.shippingAddress.region} Region
                {o.shippingAddress.deliveryInstructions && <span className="mt-2 block text-muted">{o.shippingAddress.deliveryInstructions}</span>}
              </address>
            ) : (
              <p className="mt-2">Customer collects from the shop.</p>
            )}
            {o.notes && <p className="mt-3 border-t border-flour pt-3"><span className="font-semibold">Customer note:</span> {o.notes}</p>}
          </section>
        </aside>
      </div>
    </>
  );
}
