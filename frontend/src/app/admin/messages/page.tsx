'use client';

import { useState } from 'react';
import { PageHeader, Pager } from '@/components/admin/ui';
import { ErrorState } from '@/components/support/ErrorState';
import { Skeleton } from '@/components/support/Skeleton';
import { api } from '@/lib/api/client';
import { formatDate, whatsAppTo } from '@/lib/format';
import type { Paginated } from '@/lib/types';
import { useLoad, useSaver } from '@/hooks/use-load';

interface Message { id: string; name: string; email: string; phone: string | null; topic: string; orderNumber: string | null; message: string; status: 'NEW' | 'HANDLED'; createdAt: string; handledAt: string | null }
const TOPIC: Record<string, string> = { ORDER: 'Order', CUSTOM_CAKE: 'Custom cake or event', DELIVERY: 'Delivery', PRODUCT: 'Product', OTHER: 'Other' };

export default function MessagesPage() {
  const [status, setStatus] = useState<'NEW' | 'HANDLED' | ''>('NEW');
  const [page, setPage] = useState(1);
  const { data, error, reload } = useLoad(() => api.get<Paginated<Message>>('/admin/messages', { params: { status: status || undefined, page, limit: 20 } }).then((r) => r.data), [status, page]);
  const saver = useSaver();

  return (
    <>
      <PageHeader title="Messages" description="Enquiries from the Contact page. You also get each one by email. Reply by email or WhatsApp, then mark it handled." />
      <div role="tablist" aria-label="Message status" className="mb-4 flex gap-1 border-b border-flour">
        {([['NEW', 'New'], ['HANDLED', 'Handled'], ['', 'All']] as const).map(([v, l]) => (
          <button key={l} role="tab" type="button" aria-selected={status === v} onClick={() => { setStatus(v); setPage(1); }}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${status === v ? 'border-burgundy font-semibold' : 'border-transparent text-muted'}`}>{l}</button>
        ))}
      </div>
      {error && <ErrorState message={error.message} onRetry={reload} />}
      {!data && !error && <Skeleton className="h-48" />}
      {data && data.items.length === 0 && <p className="text-muted">No messages here.</p>}
      {data && (
        <ul className="space-y-4">
          {data.items.map((m) => {
            const chat = whatsAppTo(m.phone);
            return (
              <li key={m.id} className={`panel p-5 ${m.status === 'HANDLED' ? 'opacity-75' : ''}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p><span className="font-semibold">{m.name}</span> <span className="text-sm text-muted">about {TOPIC[m.topic] ?? m.topic}{m.orderNumber ? ` (${m.orderNumber})` : ''}</span></p>
                  <p className="text-sm text-muted">{formatDate(m.createdAt)}</p>
                </div>
                <p className="mt-3 whitespace-pre-line">{m.message}</p>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                  <a className="btn btn-secondary h-9 min-h-0" href={`mailto:${m.email}?subject=${encodeURIComponent('Re: your message')}`}>Reply by email</a>
                  {chat && <a className="btn btn-secondary h-9 min-h-0" target="_blank" rel="noopener noreferrer" href={chat}>WhatsApp</a>}
                  <span className="text-muted">{m.email}{m.phone ? ` · ${m.phone}` : ''}</span>
                  <button type="button" className="ml-auto underline" disabled={saver.saving}
                    onClick={async () => { if (await saver.run(() => api.patch(`/admin/messages/${m.id}`, { status: m.status === 'NEW' ? 'HANDLED' : 'NEW' }))) reload(); }}>
                    {m.status === 'NEW' ? 'Mark handled' : 'Mark as new'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {data && <Pager page={data.page} totalPages={data.totalPages} onPage={setPage} />}
    </>
  );
}
