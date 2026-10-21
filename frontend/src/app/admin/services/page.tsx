'use client';

import { useState } from 'react';
import { ImageField } from '@/components/admin/ImageField';
import { Field, PageHeader, SaveStatus, Table, Toggle } from '@/components/admin/ui';
import { ErrorState } from '@/components/support/ErrorState';
import { Skeleton } from '@/components/support/Skeleton';
import { api } from '@/lib/api/client';
import { slugify } from '@/lib/api/admin';
import { useLoad, useSaver } from '@/hooks/use-load';

interface Service { id: string; name: string; slug: string; description: string; imageUrl: string | null; isActive: boolean; sortOrder: number; _count: { requests: number } }

export default function ServicesAdminPage() {
  const list = useLoad(() => api.get<Service[]>('/admin/services').then((r) => r.data), []);
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  if (list.error) return <ErrorState message={list.error.message} onRetry={list.reload} />;
  if (!list.data) return <Skeleton className="h-48" />;
  const done = () => { setEditing(null); list.reload(); };
  return (
    <>
      <PageHeader title="Services" description="What customers can request a quote for on the Custom cakes and events page. Hide a service to stop new requests; existing requests are unaffected."
        actions={editing !== 'new' && <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>Add service</button>} />
      {editing === 'new' && <ServiceEditor count={list.data.length} onDone={done} onCancel={() => setEditing(null)} />}
      <Table caption="Services">
        <thead><tr><th>Service</th><th className="text-right">Requests</th><th>Shown</th><th /></tr></thead>
        <tbody>
          {list.data.map((s) => editing === s.id ? (
            <tr key={s.id}><td colSpan={4} className="!p-0"><ServiceEditor service={s} count={list.data!.length} onDone={done} onCancel={() => setEditing(null)} /></td></tr>
          ) : (
            <tr key={s.id} className={s.isActive ? '' : 'opacity-60'}>
              <td>{s.name}<span className="block text-xs text-muted">{s.description}</span></td>
              <td className="text-right">{s._count.requests}</td>
              <td>{s.isActive ? 'Yes' : 'Hidden'}</td>
              <td className="text-right"><button type="button" className="text-sm underline" onClick={() => setEditing(s.id)}>Edit</button></td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}

function ServiceEditor({ service, count, onDone, onCancel }: { service?: Service; count: number; onDone: () => void; onCancel: () => void }) {
  const saver = useSaver();
  const [f, setF] = useState({ name: service?.name ?? '', slug: service?.slug ?? '', description: service?.description ?? '', imageUrl: service?.imageUrl ?? null as string | null, isActive: service?.isActive ?? true, sortOrder: String(service?.sortOrder ?? count + 1) });
  const locked = Boolean(service && service._count.requests > 0);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const ok = f.name.trim().length >= 2 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(f.slug) && f.description.trim().length >= 10;
  return (
    <form className="panel mb-6 grid gap-5 p-5 sm:grid-cols-2" onSubmit={async (e) => {
      e.preventDefault();
      const body = { ...f, sortOrder: Number(f.sortOrder) || 0 };
      if (await saver.run(() => (service ? api.patch(`/admin/services/${service.id}`, body) : api.post('/admin/services', body)), 'Service saved')) onDone();
    }}>
      <Field id="sn" label="Name"><input id="sn" className="field" value={f.name} onChange={(e) => { set('name', e.target.value); if (!service) set('slug', slugify(e.target.value)); }} /></Field>
      <Field id="ss" label="Web name" hint={locked ? 'Fixed because requests already use it.' : `Used in links, e.g. /services/request?service=${f.slug || '…'}`}>
        <input id="ss" className="field" value={f.slug} disabled={locked} onChange={(e) => set('slug', e.target.value)} />
      </Field>
      <Field id="sd" label="Short description" className="sm:col-span-2"><textarea id="sd" className="field min-h-16" maxLength={500} value={f.description} onChange={(e) => set('description', e.target.value)} /></Field>
      <ImageField id="si" label="Image" value={f.imageUrl} onChange={(v) => set('imageUrl', v)} />
      <div className="space-y-3">
        <Field id="so" label="Order"><input id="so" className="field w-20" inputMode="numeric" value={f.sortOrder} onChange={(e) => set('sortOrder', e.target.value.replace(/\D/g, ''))} /></Field>
        <Toggle id="sa" label="Shown to customers" checked={f.isActive} onChange={(v) => set('isActive', v)} />
      </div>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button className="btn btn-primary" disabled={!ok || saver.saving}>Save service</button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <SaveStatus status={saver.status} message={saver.message} />
      </div>
    </form>
  );
}
