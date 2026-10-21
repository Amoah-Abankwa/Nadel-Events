'use client';

import { useState } from 'react';
import { PageHeader, Table, Toggle } from '@/components/admin/ui';
import { ErrorState } from '@/components/support/ErrorState';
import { Skeleton } from '@/components/support/Skeleton';
import { api } from '@/lib/api/client';
import { formatDate } from '@/lib/format';
import { useLoad } from '@/hooks/use-load';

interface Row { id: string; email: string; source: string; consentAt: string; unsubscribedAt: string | null; createdAt: string }

export default function NewsletterAdminPage() {
  const [all, setAll] = useState(false);
  const { data, error, reload } = useLoad(() => api.get<{ items: Row[]; active: number; total: number }>('/admin/newsletter', { params: { all } }).then((r) => r.data), [all]);

  const download = () => {
    if (!data) return;
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lines = ['email,signed_up,consent_at,source,status', ...data.items.map((r) => [r.email, r.createdAt, r.consentAt, r.source, r.unsubscribedAt ? 'unsubscribed' : 'active'].map(esc).join(','))];
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `newsletter-${new Date().toISOString().slice(0, 10)}.csv` });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader
        title="Newsletter"
        description="People who signed up on the website and agreed to marketing emails. Only email active subscribers, and include an unsubscribe link in every email."
        actions={<button type="button" className="btn btn-secondary" onClick={download} disabled={!data?.items.length}>Download CSV</button>}
      />
      {error && <ErrorState message={error.message} onRetry={reload} />}
      {!data && !error && <Skeleton className="h-40" />}
      {data && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-6">
            <p><span className="font-display text-3xl text-cocoa">{data.active}</span> <span className="text-muted">active subscribers</span></p>
            <Toggle id="all" label="Include unsubscribed" checked={all} onChange={setAll} />
          </div>
          <Table caption="Subscribers">
            <thead><tr><th>Email</th><th>Signed up</th><th>Where</th><th>Status</th></tr></thead>
            <tbody>
              {data.items.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-muted">No subscribers yet.</td></tr>}
              {data.items.map((r) => (
                <tr key={r.id}>
                  <td>{r.email}</td>
                  <td className="whitespace-nowrap">{formatDate(r.createdAt)}</td>
                  <td className="text-muted">{r.source.replace('home.sidebar', 'Home page')}</td>
                  <td>{r.unsubscribedAt ? <span className="text-muted">Unsubscribed</span> : 'Active'}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </>
      )}
    </>
  );
}
