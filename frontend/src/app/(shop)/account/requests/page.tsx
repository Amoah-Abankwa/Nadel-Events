'use client';

import Link from 'next/link';
import { EmptyNotice } from '@/components/store/EmptyNotice';
import { ErrorState } from '@/components/support/ErrorState';
import { Skeleton } from '@/components/support/Skeleton';
import { REQUEST_STATUS_LABEL, requestsApi } from '@/lib/api/requests';
import { useLoad } from '@/hooks/use-load';

export default function MyRequestsPage() {
  const { data, error, reload } = useLoad(() => requestsApi.mine(), []);

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-sans text-2xl font-normal text-charcoal">Cake and event requests</h1>
        <Link href="/services/request" className="btn btn-primary">New request</Link>
      </div>
      {error && <ErrorState message={error.message} onRetry={reload} />}
      {!data && !error && <Skeleton className="h-40" />}
      {data && data.items.length === 0 && (
        <EmptyNotice text="You haven’t requested a custom cake or event quote yet." href="/services" label="Request a quote" />
      )}
      {data && data.items.length > 0 && (
        <ul className="divide-y divide-flour border-y border-flour">
          {data.items.map((r) => (
            <li key={r.reference}>
              <Link href={`/account/requests/${r.reference}`} className="grid gap-1 py-5 hover:bg-paper sm:grid-cols-[1fr_auto] sm:items-center">
                <span>
                  <span className="block font-semibold">{r.service.name} for {new Date(`${r.eventDate}T12:00:00Z`).toLocaleDateString('en-GH', { dateStyle: 'long' })}</span>
                  <span className="block text-sm text-muted">{r.reference}</span>
                </span>
                <span className={`text-sm font-semibold ${r.status === 'QUOTED' || r.status === 'ACCEPTED' ? 'text-burgundy' : ''}`}>{REQUEST_STATUS_LABEL[r.status]}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
