'use client';

import Link from 'next/link';
import { PageHeader } from '@/components/admin/ui';
import { ErrorState } from '@/components/support/ErrorState';
import { Skeleton } from '@/components/support/Skeleton';
import { adminApi } from '@/lib/api/admin';
import { formatMoney } from '@/lib/format';
import { useLoad } from '@/hooks/use-load';
import { useSession } from '@/stores/session-store';

export default function AdminOverview() {
  const role = useSession((s) => s.user?.role);
  const { data, error, reload } = useLoad(() => adminApi.summary(), []);

  if (error) return <ErrorState message={error.message} onRetry={reload} />;
  if (!data) return <Skeleton className="h-48" />;

  const attention = [
    { n: data.needsReconciliation, text: 'orders need a payment check', href: '/admin/orders?needsReconciliation=true', urgent: true },
    { n: data.newRequests, text: 'cake and event requests need a quote', href: '/admin/requests?status=SUBMITTED' },
    { n: data.newMessages, text: 'new messages from the Contact page', href: '/admin/messages' },
    { n: data.toFulfil, text: 'paid orders to prepare', href: '/admin/orders?status=PAID' },
    { n: data.pendingReviews, text: 'reviews waiting for approval', href: '/admin/reviews', adminOnly: true },
    { n: data.refundsStuck, text: 'refunds pending at Hubtel for over a day', href: '/admin/orders?paymentStatus=REFUND_PENDING', urgent: true, adminOnly: true },
    { n: data.lowStock, text: 'items low or out of stock', href: '/admin/products?lowStock=1', adminOnly: true },
    { n: data.deadNotifications, text: 'messages failed to send', href: '/admin/notifications', urgent: true, adminOnly: true },
  ].filter((a) => a.n > 0 && (!a.adminOnly || role === 'ADMIN'));

  return (
    <>
      <PageHeader title="Today" />
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Sales today', value: formatMoney(data.salesToday) },
          { label: 'Paid orders today', value: String(data.paidOrdersToday) },
          { label: 'Awaiting payment', value: String(data.pendingPayment) },
          { label: 'Ready or on the way', value: String(data.inProgress) },
        ].map((s) => (
          <div key={s.label} className="panel p-5">
            <dt className="text-sm text-muted">{s.label}</dt>
            <dd className="mt-1 font-display text-3xl text-cocoa">{s.value}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="attention" className="mt-10">
        <h2 id="attention" className="text-2xl">Needs attention</h2>
        {attention.length === 0 ? (
          <p className="mt-3 text-muted">Nothing waiting. New paid orders will show up here.</p>
        ) : (
          <ul className="mt-4 divide-y divide-flour border-y border-flour">
            {attention.map((a) => (
              <li key={a.href}>
                <Link href={a.href} className="flex items-center gap-4 py-4 hover:bg-paper">
                  <span className={`min-w-10 font-display text-2xl ${a.urgent ? 'text-danger' : 'text-cocoa'}`}>{a.n}</span>
                  <span>{a.text}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
