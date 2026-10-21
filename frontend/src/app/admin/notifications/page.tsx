'use client';

import { useState } from 'react';
import { PageHeader, SaveStatus, StatusBadge, Table } from '@/components/admin/ui';
import { ErrorState } from '@/components/support/ErrorState';
import { Skeleton } from '@/components/support/Skeleton';
import { adminApi } from '@/lib/api/admin';
import { formatDate } from '@/lib/format';
import { useLoad, useSaver } from '@/hooks/use-load';

const TYPE_LABEL: Record<string, string> = {
  ORDER_PLACED: 'Order received',
  PAYMENT_CONFIRMED: 'Payment receipt',
  ORDER_STATUS_CHANGED: 'Order update',
  OWNER_NEW_ORDER: 'New order alert (to you)',
  PASSWORD_RESET: 'Password reset',
};

export default function NotificationsPage() {
  const [status, setStatus] = useState('DEAD');
  const { data, error, reload } = useLoad(() => adminApi.notifications(status), [status]);
  const saver = useSaver();

  return (
    <>
      <PageHeader title="Failed messages" description="Emails are retried automatically for several hours. Messages that still fail land here. Fix the cause (for example the email domain or API key), then retry." />
      <div className="mb-4 w-48">
        <label htmlFor="st" className="label">Show</label>
        <select id="st" className="field" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="DEAD">Failed</option>
          <option value="PENDING">Waiting to send</option>
          <option value="SENT">Sent</option>
        </select>
      </div>
      {error && <ErrorState message={error.message} onRetry={reload} />}
      {!data && !error && <Skeleton className="h-48" />}
      {data && (
        <Table caption="Messages">
          <thead><tr><th>Message</th><th>To</th><th>Created</th><th>Attempts</th><th>Last error</th><th /></tr></thead>
          <tbody>
            {data.items.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-muted">{status === 'DEAD' ? 'No failed messages.' : 'Nothing here.'}</td></tr>}
            {data.items.map((n) => (
              <tr key={n.id}>
                <td>{TYPE_LABEL[n.type] ?? n.type} <StatusBadge status={n.status} /></td>
                <td>{n.recipient}</td>
                <td className="whitespace-nowrap">{formatDate(n.createdAt)}</td>
                <td>{n.attempts}</td>
                <td className="max-w-xs text-xs text-muted">{n.lastError ?? '—'}</td>
                <td>
                  {n.status === 'DEAD' && (
                    <button type="button" className="btn btn-secondary" disabled={saver.saving}
                      onClick={async () => { if (await saver.run(() => adminApi.retryNotification(n.id), 'Queued to send again')) reload(); }}>
                      Retry
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <p className="mt-3"><SaveStatus status={saver.status} message={saver.message} /></p>
    </>
  );
}
