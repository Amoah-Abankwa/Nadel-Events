'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { PageHeader, Pager, StatusBadge, Table } from '@/components/admin/ui';
import { ErrorState } from '@/components/support/ErrorState';
import { Skeleton } from '@/components/support/Skeleton';
import { adminApi } from '@/lib/api/admin';
import { ORDER_STATUS_LABEL, formatDate, formatMoney } from '@/lib/format';
import { useLoad } from '@/hooks/use-load';

const STATUSES = ['PENDING_PAYMENT', 'PAID', 'PROCESSING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERY_EXCEPTION', 'COMPLETED', 'PAYMENT_FAILED', 'CANCELLED', 'EXPIRED'];

function OrdersList() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const filters = {
    status: params.get('status') ?? undefined,
    paymentStatus: params.get('paymentStatus') ?? undefined,
    fulfilmentType: params.get('fulfilmentType') ?? undefined,
    needsReconciliation: params.get('needsReconciliation') ?? undefined,
    q: params.get('q') ?? undefined,
    page: Number(params.get('page') ?? 1),
  };
  const { data, error, loading, reload } = useLoad(() => adminApi.orders({ ...filters, limit: 25 }), [params.toString()]);

  const set = (next: Record<string, string | undefined>) => {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) (v ? p.set(k, v) : p.delete(k));
    if (!('page' in next)) p.delete('page');
    router.push(`${pathname}?${p.toString()}`);
  };

  return (
    <>
      <PageHeader title="Orders" description="Paid orders move from Paid → Being prepared → Ready for pickup or Out for delivery → Completed. Customers get an email at each step." />

      <form
        className="mb-4 flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          set({ q: String(new FormData(e.currentTarget).get('q') ?? '') || undefined });
        }}
      >
        <div className="w-56">
          <label htmlFor="q" className="label">Order number or email</label>
          <input id="q" name="q" type="search" defaultValue={filters.q} className="field" />
        </div>
        <div className="w-48">
          <label htmlFor="status" className="label">Status</label>
          <select id="status" className="field" value={filters.status ?? ''} onChange={(e) => set({ status: e.target.value || undefined })}>
            <option value="">All</option>
            {STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>)}
          </select>
        </div>
        <div className="w-40">
          <label htmlFor="ft" className="label">Fulfilment</label>
          <select id="ft" className="field" value={filters.fulfilmentType ?? ''} onChange={(e) => set({ fulfilmentType: e.target.value || undefined })}>
            <option value="">All</option>
            <option value="PICKUP">Pickup</option>
            <option value="DELIVERY">Delivery</option>
          </select>
        </div>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-burgundy" checked={filters.needsReconciliation === 'true'} onChange={(e) => set({ needsReconciliation: e.target.checked ? 'true' : undefined })} />
          Needs payment check
        </label>
        <button type="submit" className="btn btn-secondary">Search</button>
      </form>

      {filters.paymentStatus && (
        <p className="mb-3 text-sm">
          Showing payment status: {filters.paymentStatus.toLowerCase().replace(/_/g, ' ')}.{' '}
          <button type="button" className="underline" onClick={() => set({ paymentStatus: undefined })}>Show all</button>
        </p>
      )}
      {error && <ErrorState message={error.message} onRetry={reload} />}
      {loading && !data && <Skeleton className="h-64" />}
      {data && (
        <>
          <Table caption="Orders">
            <thead>
              <tr><th>Order</th><th>Placed</th><th>Customer</th><th>Fulfilment</th><th>Status</th><th className="text-right">Total</th></tr>
            </thead>
            <tbody>
              {data.items.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-muted">No orders match these filters.</td></tr>}
              {data.items.map((o) => (
                <tr key={o.id} className={loading ? 'opacity-60' : ''}>
                  <td>
                    <Link href={`/admin/orders/${encodeURIComponent(o.orderNumber)}`} className="font-semibold text-burgundy underline-offset-2 hover:underline">{o.orderNumber}</Link>
                    {o.needsReconciliation && <span className="ml-2 text-xs font-semibold text-danger">Check payment</span>}
                    {o.serviceRequest && <span className="block text-xs text-muted">Deposit for {o.serviceRequest.reference}</span>}
                  </td>
                  <td className="whitespace-nowrap">{formatDate(o.placedAt)}</td>
                  <td>{o.contactName}<span className="block text-xs text-muted">{o.contactPhone}</span></td>
                  <td>{o.serviceRequest ? 'Deposit' : o.fulfilmentType === 'PICKUP' ? 'Pickup' : `Delivery${o.shippingAddress ? `, ${o.shippingAddress.region}` : ''}`}</td>
                  <td><StatusBadge status={o.status} /></td>
                  <td className="text-right font-semibold">{formatMoney(o.total, o.currency)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Pager page={data.page} totalPages={data.totalPages} onPage={(p) => set({ page: String(p) })} />
        </>
      )}
    </>
  );
}

export default function OrdersPage() {
  return <Suspense fallback={<Skeleton className="h-64" />}><OrdersList /></Suspense>;
}
