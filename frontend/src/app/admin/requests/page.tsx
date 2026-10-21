'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { PageHeader, Pager, Table } from '@/components/admin/ui';
import { ErrorState } from '@/components/support/ErrorState';
import { Skeleton } from '@/components/support/Skeleton';
import { REQUEST_STATUS_LABEL, requestsApi, type RequestStatus } from '@/lib/api/requests';
import { formatMoney } from '@/lib/format';
import { useLoad } from '@/hooks/use-load';

const TABS: { status?: RequestStatus; label: string }[] = [
  { status: 'SUBMITTED', label: 'Needs a quote' },
  { status: 'QUOTED', label: 'Quote sent' },
  { status: 'ACCEPTED', label: 'Deposit due' },
  { status: 'CONFIRMED', label: 'Booked' },
  { label: 'All' },
];

const daysUntil = (d: string) => Math.round((new Date(`${d}T00:00:00Z`).getTime() - Date.now()) / 86_400_000);

function RequestsList() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const status = params.has('status') ? params.get('status') || undefined : 'SUBMITTED';
  const page = Number(params.get('page') ?? 1);
  const q = params.get('q') ?? undefined;
  const { data, error, loading, reload } = useLoad(() => requestsApi.adminList({ status, page, q, limit: 25 }), [params.toString()]);

  const go = (next: Record<string, string>) => {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) p.set(k, v);
    if (!('page' in next)) p.delete('page');
    router.push(`${pathname}?${p.toString()}`);
  };

  return (
    <>
      <PageHeader title="Cake and event requests" description="Soonest events first. Send a quote; the customer accepts and pays the deposit online, which books the date." />
      <div role="tablist" aria-label="Request status" className="mb-4 flex flex-wrap gap-1 border-b border-flour">
        {TABS.map((t) => {
          const active = (t.status ?? '') === (status ?? '');
          return (
            <button key={t.label} role="tab" type="button" aria-selected={active} onClick={() => go({ status: t.status ?? '' })}
              className={`-mb-px border-b-2 px-3 py-2 text-sm ${active ? 'border-burgundy font-semibold' : 'border-transparent text-muted hover:text-charcoal'}`}>
              {t.label}
            </button>
          );
        })}
        <form className="ml-auto pb-2" onSubmit={(e) => { e.preventDefault(); go({ q: String(new FormData(e.currentTarget).get('q') ?? '') }); }}>
          <label htmlFor="rq" className="sr-only">Search by reference or email</label>
          <input id="rq" name="q" type="search" placeholder="Reference or email" defaultValue={q} className="field w-56" />
        </form>
      </div>

      {error && <ErrorState message={error.message} onRetry={reload} />}
      {loading && !data && <Skeleton className="h-64" />}
      {data && (
        <>
          <Table caption="Requests">
            <thead><tr><th>Event date</th><th>Request</th><th>Customer</th><th>Budget</th><th>Quote</th><th>Status</th></tr></thead>
            <tbody>
              {data.items.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-muted">Nothing here.</td></tr>}
              {data.items.map((r) => {
                const days = daysUntil(r.eventDate);
                return (
                  <tr key={r.reference} className={loading ? 'opacity-60' : ''}>
                    <td className="whitespace-nowrap">
                      {new Date(`${r.eventDate}T12:00:00Z`).toLocaleDateString('en-GH', { weekday: 'short', day: 'numeric', month: 'short' })}
                      <span className={`block text-xs ${days <= 3 && days >= 0 ? 'font-semibold text-danger' : 'text-muted'}`}>
                        {days < 0 ? 'Past' : days === 0 ? 'Today' : `in ${days} day${days === 1 ? '' : 's'}`}
                      </span>
                    </td>
                    <td>
                      <Link href={`/admin/requests/${r.reference}`} className="font-semibold text-burgundy hover:underline">{r.service.name}</Link>
                      <span className="block text-xs text-muted">{r.reference}{r.guestCount ? `, ${r.guestCount} guests` : ''}{r.imageCount ? `, ${r.imageCount} photo${r.imageCount === 1 ? '' : 's'}` : ''}</span>
                    </td>
                    <td>{r.customer.name}<span className="block text-xs text-muted">{r.contactPhone}</span></td>
                    <td>{r.budget ? formatMoney(r.budget) : '—'}</td>
                    <td>{r.quote ? formatMoney(r.quote.amount) : '—'}</td>
                    <td className="whitespace-nowrap">{REQUEST_STATUS_LABEL[r.status]}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
          <Pager page={data.page} totalPages={data.totalPages} onPage={(p) => go({ page: String(p) })} />
        </>
      )}
    </>
  );
}

export default function RequestsPage() {
  return <Suspense fallback={<Skeleton className="h-64" />}><RequestsList /></Suspense>;
}
