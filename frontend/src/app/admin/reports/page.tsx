'use client';

import { useState } from 'react';
import { PageHeader, Table } from '@/components/admin/ui';
import { ErrorState } from '@/components/support/ErrorState';
import { Skeleton } from '@/components/support/Skeleton';
import { api } from '@/lib/api/client';
import { REQUEST_STATUS_LABEL, type RequestStatus } from '@/lib/api/requests';
import { formatMoney } from '@/lib/format';
import { useLoad } from '@/hooks/use-load';

interface Report {
  range: { from: string; to: string };
  totals: { orders: number; sales: string; averageOrder: string; itemsSubtotal: string; discounts: string; deliveryFees: string; tax: string; deposits: string; depositCount: number; refunds: string; refundCount: number; net: string };
  daily: { day: string; orders: number; sales: string }[];
  bestSellers: { productId: string; name: string; quantity: number; revenue: string }[];
  byCategory: { category: string; quantity: number; revenue: string }[];
  coupons: { code: string; uses: number; discount: string; revenue: string }[];
  fulfilment: { type: string; orders: number; sales: string }[];
  bannerClicks: { title: string; placement: string; clicks: number; isSponsored: boolean }[];
  serviceRequests: { status: RequestStatus; count: number }[];
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const today = () => new Date();
const PRESETS: { label: string; range: () => [string, string] }[] = [
  { label: 'Today', range: () => [iso(today()), iso(today())] },
  { label: 'Last 7 days', range: () => [iso(new Date(Date.now() - 6 * 864e5)), iso(today())] },
  { label: 'Last 30 days', range: () => [iso(new Date(Date.now() - 29 * 864e5)), iso(today())] },
  { label: 'This month', range: () => { const t = today(); return [iso(new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), 1))), iso(t)]; } },
  { label: 'Last month', range: () => { const t = today(); return [iso(new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() - 1, 1))), iso(new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), 0)))]; } },
];

function toCsv(r: Report) {
  const rows: (string | number)[][] = [
    ['Sales report', `${r.range.from} to ${r.range.to}`],
    [],
    ['Day', 'Paid orders', 'Sales (GHS)'],
    ...r.daily.map((d) => [d.day, d.orders, d.sales]),
    [],
    ['Totals'],
    ...Object.entries(r.totals).map(([k, v]) => [k, v]),
    [],
    ['Best sellers', 'Quantity', 'Revenue'],
    ...r.bestSellers.map((b) => [b.name, b.quantity, b.revenue]),
    [],
    ['Coupon', 'Uses', 'Discount given', 'Order revenue'],
    ...r.coupons.map((c) => [c.code, c.uses, c.discount, c.revenue]),
  ];
  return rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
}

export default function ReportsPage() {
  const [[from, to], setRange] = useState<[string, string]>(PRESETS[2].range());
  const { data: r, error, loading, reload } = useLoad(() => api.get<Report>('/admin/reports/sales', { params: { from, to } }).then((x) => x.data), [from, to]);

  const download = () => {
    if (!r) return;
    const url = URL.createObjectURL(new Blob([toCsv(r)], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-${r.range.from}-to-${r.range.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const maxDay = Math.max(1, ...(r?.daily.map((d) => Number(d.sales)) ?? [1]));

  return (
    <>
      <PageHeader title="Reports" description="A sale counts on the day its payment was confirmed. Deposits for cake and event bookings are shown separately. Refunds count on the day they were made." actions={r && <button type="button" className="btn btn-secondary" onClick={download}>Download CSV</button>} />

      <div className="mb-6 flex flex-wrap items-end gap-3">
        {PRESETS.map((p) => (
          <button key={p.label} type="button" className="btn btn-secondary" onClick={() => setRange(p.range())}>{p.label}</button>
        ))}
        <div><label htmlFor="from" className="label">From</label><input id="from" type="date" className="field" value={from} max={to} onChange={(e) => setRange([e.target.value, to])} /></div>
        <div><label htmlFor="to" className="label">To</label><input id="to" type="date" className="field" value={to} min={from} onChange={(e) => setRange([from, e.target.value])} /></div>
      </div>

      {error && <ErrorState message={error.message} onRetry={reload} />}
      {!r && !error && <Skeleton className="h-96" />}
      {r && (
        <div className={`space-y-10 ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['Shop sales', formatMoney(r.totals.sales), `${r.totals.orders} paid orders`],
              ['Average order', formatMoney(r.totals.averageOrder), ''],
              ['Booking deposits', formatMoney(r.totals.deposits), `${r.totals.depositCount} deposits`],
              ['Refunds', formatMoney(r.totals.refunds), `${r.totals.refundCount} refunds`],
            ].map(([label, value, sub]) => (
              <div key={label} className="panel p-5">
                <dt className="text-sm text-muted">{label}</dt>
                <dd className="mt-1 font-display text-3xl text-cocoa">{value}</dd>
                {sub && <dd className="text-xs text-muted">{sub}</dd>}
              </div>
            ))}
          </dl>

          <section aria-labelledby="money-h" className="grid gap-8 lg:grid-cols-2">
            <div>
              <h2 id="money-h" className="mb-3 text-xl">Where the money came from</h2>
              <dl className="panel space-y-1 p-5 text-sm">
                {[
                  ['Items (before discounts)', r.totals.itemsSubtotal],
                  ['Discounts given', `−${r.totals.discounts}`],
                  ['Delivery fees', r.totals.deliveryFees],
                  ['Tax collected', r.totals.tax],
                  ['Shop sales', r.totals.sales],
                  ['Booking deposits', r.totals.deposits],
                  ['Refunds', `−${r.totals.refunds}`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between"><dt>{k}</dt><dd>{v.startsWith('−') ? `−${formatMoney(v.slice(1))}` : formatMoney(v)}</dd></div>
                ))}
                <div className="flex justify-between border-t border-flour pt-2 text-base font-semibold"><dt>Net takings</dt><dd>{formatMoney(r.totals.net)}</dd></div>
              </dl>
              <p className="mt-2 text-xs text-muted">Tax collected is what you owe to GRA on these sales; confirm filing with your accountant.</p>
            </div>
            <div>
              <h2 className="mb-3 text-xl">Sales by day</h2>
              {r.daily.length === 0 ? <p className="text-muted">No paid orders in this period.</p> : (
                <Table caption="Sales by day">
                  <thead><tr><th>Day</th><th className="text-right">Orders</th><th className="w-1/2">Sales</th></tr></thead>
                  <tbody>
                    {r.daily.map((d) => (
                      <tr key={d.day}>
                        <td className="whitespace-nowrap">{new Date(`${d.day}T12:00:00Z`).toLocaleDateString('en-GH', { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                        <td className="text-right">{d.orders}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <span aria-hidden className="block h-3 rounded-sm bg-cocoa" style={{ width: `${(Number(d.sales) / maxDay) * 70}%` }} />
                            <span className="whitespace-nowrap text-xs">{formatMoney(d.sales)}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </div>
          </section>

          <section className="grid gap-8 lg:grid-cols-2">
            <div>
              <h2 className="mb-3 text-xl">Best sellers</h2>
              <Table caption="Best sellers">
                <thead><tr><th>Product</th><th className="text-right">Sold</th><th className="text-right">Revenue</th></tr></thead>
                <tbody>
                  {r.bestSellers.length === 0 && <tr><td colSpan={3} className="text-muted">No sales.</td></tr>}
                  {r.bestSellers.map((b) => <tr key={b.productId}><td>{b.name}</td><td className="text-right">{b.quantity}</td><td className="text-right">{formatMoney(b.revenue)}</td></tr>)}
                </tbody>
              </Table>
            </div>
            <div>
              <h2 className="mb-3 text-xl">By category</h2>
              <Table caption="Sales by category">
                <thead><tr><th>Category</th><th className="text-right">Sold</th><th className="text-right">Revenue</th></tr></thead>
                <tbody>
                  {r.byCategory.length === 0 && <tr><td colSpan={3} className="text-muted">No sales.</td></tr>}
                  {r.byCategory.map((c) => <tr key={c.category}><td>{c.category}</td><td className="text-right">{c.quantity}</td><td className="text-right">{formatMoney(c.revenue)}</td></tr>)}
                </tbody>
              </Table>
              <h3 className="mb-2 mt-6 font-sans text-base font-semibold text-charcoal">Pickup and delivery</h3>
              <ul className="text-sm">{r.fulfilment.map((f) => <li key={f.type}>{f.type === 'PICKUP' ? 'Pickup' : 'Delivery'}: {f.orders} orders, {formatMoney(f.sales)}</li>)}</ul>
            </div>
          </section>

          <section className="grid gap-8 lg:grid-cols-2">
            <div>
              <h2 className="mb-3 text-xl">Coupons</h2>
              <Table caption="Coupon performance">
                <thead><tr><th>Code</th><th className="text-right">Uses</th><th className="text-right">Discount given</th><th className="text-right">Orders worth</th></tr></thead>
                <tbody>
                  {r.coupons.length === 0 && <tr><td colSpan={4} className="text-muted">No coupons used.</td></tr>}
                  {r.coupons.map((c) => <tr key={c.code}><td className="font-mono">{c.code}</td><td className="text-right">{c.uses}</td><td className="text-right">{formatMoney(c.discount)}</td><td className="text-right">{formatMoney(c.revenue)}</td></tr>)}
                </tbody>
              </Table>
            </div>
            <div>
              <h2 className="mb-3 text-xl">Banner clicks (all time)</h2>
              <Table caption="Banner clicks">
                <thead><tr><th>Banner</th><th className="text-right">Clicks</th></tr></thead>
                <tbody>
                  {r.bannerClicks.length === 0 && <tr><td colSpan={2} className="text-muted">No clicks yet.</td></tr>}
                  {r.bannerClicks.map((b) => <tr key={b.title + b.placement}><td>{b.title}{b.isSponsored ? ' (sponsored)' : ''}</td><td className="text-right">{b.clicks}</td></tr>)}
                </tbody>
              </Table>
              <h3 className="mb-2 mt-6 font-sans text-base font-semibold text-charcoal">Cake and event requests received</h3>
              {r.serviceRequests.length === 0 ? <p className="text-sm text-muted">None in this period.</p> : (
                <ul className="text-sm">{r.serviceRequests.map((s) => <li key={s.status}>{REQUEST_STATUS_LABEL[s.status]}: {s.count}</li>)}</ul>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
