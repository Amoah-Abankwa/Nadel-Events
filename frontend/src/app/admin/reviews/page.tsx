'use client';

import Link from 'next/link';
import { useState } from 'react';
import { PageHeader, Pager } from '@/components/admin/ui';
import { Stars } from '@/components/product/Stars';
import { ErrorState } from '@/components/support/ErrorState';
import { Skeleton } from '@/components/support/Skeleton';
import { reviewsApi } from '@/lib/api/reviews';
import { formatDate } from '@/lib/format';
import { useLoad } from '@/hooks/use-load';

export default function ReviewsAdminPage() {
  const [status, setStatus] = useState('PENDING');
  const [page, setPage] = useState(1);
  const { data, error, reload, setData } = useLoad(() => reviewsApi.adminList(status || undefined, page), [status, page]);
  const [busy, setBusy] = useState<string>();

  const moderate = async (id: string, s: 'APPROVED' | 'REJECTED') => {
    setBusy(id);
    try {
      await reviewsApi.moderate(id, s);
      if (data) setData({ ...data, items: status ? data.items.filter((r) => r.id !== id) : data.items.map((r) => (r.id === id ? { ...r, status: s } : r)) });
    } finally {
      setBusy(undefined);
    }
  };

  return (
    <>
      <PageHeader title="Reviews" description="Approve reviews to show them on the product page. Reject anything abusive, off-topic or containing personal details. Rejected reviews stay private to the writer." />
      <div className="mb-4 w-48">
        <label htmlFor="rs" className="label">Show</label>
        <select id="rs" className="field" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="PENDING">Waiting for approval</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="">All</option>
        </select>
      </div>
      {error && <ErrorState message={error.message} onRetry={reload} />}
      {!data && !error && <Skeleton className="h-48" />}
      {data && data.items.length === 0 && <p className="text-muted">{status === 'PENDING' ? 'All caught up. No reviews waiting.' : 'Nothing here.'}</p>}
      {data && (
        <ul className="space-y-4">
          {data.items.map((r) => (
            <li key={r.id} className="panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-2xl">
                  <Link href={`/products/${r.product.slug}`} target="_blank" className="text-sm font-semibold text-burgundy underline-offset-2 hover:underline">{r.product.name}</Link>
                  <div className="mt-1"><Stars value={r.rating} /></div>
                  {r.title && <p className="mt-1 font-semibold">{r.title}</p>}
                  <p className="mt-1 whitespace-pre-line">{r.body}</p>
                  <p className="mt-2 text-xs text-muted">{r.user.name} ({r.user.email}){r.verifiedPurchase ? ', verified buyer' : ', not a verified buyer'}. {formatDate(r.createdAt)}.</p>
                </div>
                <div className="flex gap-2">
                  {r.status !== 'APPROVED' && <button type="button" className="btn btn-primary" disabled={busy === r.id} onClick={() => moderate(r.id, 'APPROVED')}>Approve</button>}
                  {r.status !== 'REJECTED' && <button type="button" className="btn btn-secondary" disabled={busy === r.id} onClick={() => moderate(r.id, 'REJECTED')}>Reject</button>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {data && <Pager page={data.page} totalPages={data.totalPages} onPage={setPage} />}
    </>
  );
}
