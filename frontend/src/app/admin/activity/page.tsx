'use client';

import { Fragment, useState } from 'react';
import { PageHeader, Pager, Table } from '@/components/admin/ui';
import { ErrorState } from '@/components/support/ErrorState';
import { Skeleton } from '@/components/support/Skeleton';
import { api } from '@/lib/api/client';
import { formatDate } from '@/lib/format';
import { useLoad } from '@/hooks/use-load';

interface Entry {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string;
  requestId: string | null;
  before: unknown;
  after: unknown;
  createdAt: string;
  actor: { id: string; name: string; email: string } | null;
}

const describe = (a: string) => a.replace(/[._]/g, ' ');

export default function ActivityPage() {
  const [filters, setFilters] = useState({ resourceType: '', action: '', actor: '' });
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  const { data, error, reload } = useLoad(
    () => api.get<{ items: Entry[]; page: number; totalPages: number; resourceTypes: string[] }>('/admin/audit', { params: { ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)), page, limit: 50 } }).then((r) => r.data),
    [JSON.stringify(filters), page],
  );

  return (
    <>
      <PageHeader title="Activity log" description="A permanent record of changes to prices, stock, orders, refunds, settings and staff. It can’t be edited from the app." />
      <form className="mb-4 flex flex-wrap items-end gap-3" onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setPage(1);
        setFilters({ resourceType: String(f.get('rt') ?? ''), action: String(f.get('ac') ?? ''), actor: String(f.get('who') ?? '') });
      }}>
        <div className="w-44">
          <label htmlFor="rt" className="label">What changed</label>
          <select id="rt" name="rt" className="field" defaultValue={filters.resourceType}>
            <option value="">Everything</option>
            {data?.resourceTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="w-44"><label htmlFor="ac" className="label">Action starts with</label><input id="ac" name="ac" className="field" placeholder="e.g. refund" defaultValue={filters.action} /></div>
        <div className="w-56"><label htmlFor="who" className="label">Staff email contains</label><input id="who" name="who" className="field" defaultValue={filters.actor} /></div>
        <button className="btn btn-secondary">Filter</button>
      </form>
      {error && <ErrorState message={error.message} onRetry={reload} />}
      {!data && !error && <Skeleton className="h-64" />}
      {data && (
        <>
          <Table caption="Activity log">
            <thead><tr><th>When</th><th>Who</th><th>What</th><th>Record</th><th /></tr></thead>
            <tbody>
              {data.items.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-muted">No activity matches.</td></tr>}
              {data.items.map((e) => (
                <Fragment key={e.id}>
                  <tr>
                    <td className="whitespace-nowrap">{formatDate(e.createdAt)}</td>
                    <td>{e.actor ? <>{e.actor.name}<span className="block text-xs text-muted">{e.actor.email}</span></> : <span className="text-muted">System or customer</span>}</td>
                    <td className="capitalize">{describe(e.action)}</td>
                    <td className="text-xs">{e.resourceType}<span className="block font-mono text-muted">{e.resourceId}</span></td>
                    <td className="text-right">{(e.before != null || e.after != null) && <button type="button" className="text-sm underline" aria-expanded={open === e.id} onClick={() => setOpen(open === e.id ? null : e.id)}>{open === e.id ? 'Hide' : 'Details'}</button>}</td>
                  </tr>
                  {open === e.id && (
                    <tr>
                      <td colSpan={5}>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {e.before != null && <div><p className="text-xs font-semibold">Before</p><pre className="max-h-64 overflow-auto rounded-sm bg-cream p-2 text-xs">{JSON.stringify(e.before, null, 2)}</pre></div>}
                          {e.after != null && <div><p className="text-xs font-semibold">After</p><pre className="max-h-64 overflow-auto rounded-sm bg-cream p-2 text-xs">{JSON.stringify(e.after, null, 2)}</pre></div>}
                        </div>
                        {e.requestId && <p className="mt-1 text-xs text-muted">Request {e.requestId}</p>}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </Table>
          <Pager page={data.page} totalPages={data.totalPages} onPage={setPage} />
        </>
      )}
    </>
  );
}
