'use client';

import { useState } from 'react';
import { SaveStatus, Table } from '@/components/admin/ui';
import { api } from '@/lib/api/client';
import { MONEY_RE } from '@/lib/api/admin';
import { formatDate, formatMoney } from '@/lib/format';
import { useLoad, useSaver } from '@/hooks/use-load';

interface Summary {
  paid: string;
  refunded: string;
  refundable: string;
  restockable: { variantId: string; name: string; variantName: string; max: number }[];
  refunds: { id: string; amount: string; reason: string; method: 'PROVIDER' | 'MANUAL'; status: string; failureReason: string | null; providerRefundId: string | null; createdAt: string; stuck: boolean }[];
  provider: string;
  providerRefunds: boolean;
}

/** Full or partial refund with optional restock. One idempotency key per open form, so double-clicks can't refund twice. */
export function RefundPanel({ orderNumber, currency, onChanged }: { orderNumber: string; currency: string; onChanged: () => void }) {
  const { data, reload } = useLoad(() => api.get<Summary>(`/admin/orders/${encodeURIComponent(orderNumber)}/refunds`).then((r) => r.data), [orderNumber]);
  const saver = useSaver();
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [method, setMethod] = useState<'PROVIDER' | 'MANUAL'>('MANUAL');
  const [restock, setRestock] = useState<Record<string, number>>({});

  if (!data) return null;
  const m = (v: string) => formatMoney(v, currency);
  const canRefund = Number(data.refundable) > 0;
  if (!canRefund && data.refunds.length === 0) return null;

  const start = () => {
    setKey(crypto.randomUUID());
    setAmount(data.refundable);
    setReason('');
    setMethod(data.providerRefunds ? 'PROVIDER' : 'MANUAL');
    setRestock({});
    saver.reset();
    setOpen(true);
  };
  const amountOk = MONEY_RE.test(amount) && Number(amount) > 0 && Number(amount) <= Number(data.refundable);

  return (
    <section aria-labelledby="refunds-h" className="panel p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="refunds-h" className="text-xl">Refunds</h2>
        <p className="text-sm text-muted">Paid {m(data.paid)}. Refunded {m(data.refunded)}.</p>
      </div>

      {data.refunds.length > 0 && (
        <div className="mt-3">
          <Table caption="Refunds">
            <thead><tr><th>When</th><th className="text-right">Amount</th><th>How</th><th>Status</th><th>Reason</th></tr></thead>
            <tbody>
              {data.refunds.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap">{formatDate(r.createdAt)}</td>
                  <td className="text-right">{m(r.amount)}</td>
                  <td>{r.method === 'PROVIDER' ? 'Payment provider' : 'Recorded (paid outside)'}</td>
                  <td>
                    {r.status === 'PENDING' ? 'Waiting for Hubtel' : r.status.toLowerCase()}
                    {r.failureReason && <span className="block text-xs text-danger">{r.failureReason}</span>}
                    {r.stuck && <span className="block text-xs font-semibold text-danger">Pending over a day. Check in the Hubtel dashboard.</span>}
                    {r.providerRefundId && <span className="block font-mono text-xs text-muted">{r.providerRefundId}</span>}
                    {r.status === 'PENDING' && r.method === 'PROVIDER' && (
                      <button type="button" className="mt-1 block text-xs underline" disabled={saver.saving}
                        onClick={async () => { if (await saver.run(() => api.post(`/admin/refunds/${r.id}/recheck`).then((x) => x.data), 'Status updated')) { reload(); onChanged(); } }}>
                        Check with Hubtel now
                      </button>
                    )}
                  </td>
                  <td className="text-xs">{r.reason}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}

      {canRefund && !open && <button type="button" className="btn btn-secondary mt-4" onClick={start}>Refund this order</button>}

      {open && (
        <form className="mt-4 space-y-4" onSubmit={async (e) => {
          e.preventDefault();
          const lines = Object.entries(restock).filter(([, q]) => q > 0).map(([variantId, quantity]) => ({ variantId, quantity }));
          const r = await saver.run(() => api.post(`/admin/orders/${encodeURIComponent(orderNumber)}/refunds`, { amount, reason, method, restock: lines, idempotencyKey: key }).then((x) => x.data as { status: string }), 'Refund recorded. The customer has been emailed.');
          if (r) { setOpen(false); await reload(); onChanged(); }
        }}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="rf-amount" className="label">Amount ({currency})</label>
              <input id="rf-amount" className="field" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.trim())} aria-invalid={!!amount && !amountOk} />
              <p className="mt-1 text-xs text-muted">Up to {m(data.refundable)}.{' '}
                <button type="button" className="underline" onClick={() => setAmount(data.refundable)}>Full amount</button>
              </p>
            </div>
            <fieldset>
              <legend className="label">How</legend>
              <label className={`flex gap-2 text-sm ${data.providerRefunds ? '' : 'opacity-50'}`}>
                <input type="radio" name="rf-method" className="accent-burgundy" disabled={!data.providerRefunds} checked={method === 'PROVIDER'} onChange={() => setMethod('PROVIDER')} />
                Send back through the payment provider{!data.providerRefunds && ' (not set up yet)'}
              </label>
              <label className="mt-1 flex gap-2 text-sm">
                <input type="radio" name="rf-method" className="accent-burgundy" checked={method === 'MANUAL'} onChange={() => setMethod('MANUAL')} />
                I’ve already refunded it (Hubtel dashboard, MoMo or cash). Record it.
              </label>
            </fieldset>
            <div className="sm:col-span-2">
              <label htmlFor="rf-reason" className="label">Reason (the customer sees this)</label>
              <input id="rf-reason" className="field" maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Item arrived damaged" />
            </div>
          </div>
          {data.restockable.some((r) => r.max > 0) && (
            <fieldset>
              <legend className="label">Put items back in stock (optional)</legend>
              <p className="mb-2 text-xs text-muted">Only for items you’ve received back in sellable condition.</p>
              <ul className="space-y-2">
                {data.restockable.filter((r) => r.max > 0).map((r) => (
                  <li key={r.variantId} className="flex items-center gap-3 text-sm">
                    <input aria-label={`Quantity of ${r.name} to restock`} className="field w-20" inputMode="numeric" value={restock[r.variantId] ?? 0}
                      onChange={(e) => setRestock({ ...restock, [r.variantId]: Math.min(r.max, Math.max(0, Number(e.target.value.replace(/\D/g, '')) || 0)) })} />
                    <span>{r.name}{r.variantName !== 'Standard' ? ` (${r.variantName})` : ''}, up to {r.max}</span>
                  </li>
                ))}
              </ul>
            </fieldset>
          )}
          <p className="text-xs text-muted">Coupon uses are not returned on refund.</p>
          <div className="flex flex-wrap items-center gap-3">
            {method === 'PROVIDER' && <p className="w-full text-xs text-muted">Sent to Hubtel now. Mobile money refunds can take a while; the status updates automatically and the customer is emailed when it completes.</p>}
              <button className="btn btn-primary" disabled={!amountOk || reason.trim().length < 3 || saver.saving}>
              {method === 'PROVIDER' ? `Refund ${amountOk ? m(amount) : ''}` : `Record ${amountOk ? m(amount) : ''} refund`}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
            <SaveStatus status={saver.status} message={saver.message} />
          </div>
        </form>
      )}
    </section>
  );
}
