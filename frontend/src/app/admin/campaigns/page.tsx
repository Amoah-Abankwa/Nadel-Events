'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ImageField, fromLocalInput, liveState, shortWhen, toLocalInput } from '@/components/admin/ImageField';
import { Field, PageHeader, SaveStatus, Table } from '@/components/admin/ui';
import { ErrorState } from '@/components/support/ErrorState';
import { Skeleton } from '@/components/support/Skeleton';
import { adminApi, slugify, type AdminProduct } from '@/lib/api/admin';
import { marketingApi, type AdminCampaign } from '@/lib/api/marketing';
import { useLoad, useSaver } from '@/hooks/use-load';

export default function CampaignsPage() {
  const campaigns = useLoad(() => marketingApi.campaigns(), []);
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  if (campaigns.error) return <ErrorState message={campaigns.error.message} onRetry={campaigns.reload} />;
  if (!campaigns.data) return <Skeleton className="h-64" />;
  const done = () => { setEditing(null); campaigns.reload(); };

  return (
    <>
      <PageHeader
        title="Campaign pages"
        description="A landing page for a promotion at /promotions/your-page: headline, picked products and an optional coupon code. Link to it from a banner."
        actions={editing !== 'new' && <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>New campaign</button>}
      />
      {editing === 'new' && <CampaignEditor onDone={done} onCancel={() => setEditing(null)} />}
      <Table caption="Campaigns">
        <thead><tr><th>Campaign</th><th>When</th><th className="text-right">Products</th><th>Status</th><th /></tr></thead>
        <tbody>
          {campaigns.data.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-muted">No campaigns yet.</td></tr>}
          {campaigns.data.map((c) => editing === c.id ? (
            <tr key={c.id}><td colSpan={5} className="!p-0"><CampaignEditor campaign={c} onDone={done} onCancel={() => setEditing(null)} /></td></tr>
          ) : (
            <tr key={c.id}>
              <td>{c.name}<span className="block text-xs text-muted">/promotions/{c.slug}{c.content.couponCode ? `, code ${c.content.couponCode}` : ''}</span></td>
              <td className="whitespace-nowrap text-xs">{c.startsAt || c.endsAt ? `${c.startsAt ? shortWhen(c.startsAt) : 'Now'} to ${c.endsAt ? shortWhen(c.endsAt) : 'no end'}` : 'Always'}</td>
              <td className="text-right">{c.content.productIds.length}</td>
              <td>{liveState(c)}</td>
              <td className="whitespace-nowrap text-right text-sm">
                <Link href={`/promotions/${c.slug}`} target="_blank" className="mr-3 underline">Preview</Link>
                <button type="button" className="underline" onClick={() => setEditing(c.id)}>Edit</button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}

function CampaignEditor({ campaign, onDone, onCancel }: { campaign?: AdminCampaign; onDone: () => void; onCancel: () => void }) {
  const saver = useSaver();
  const [f, setF] = useState({
    name: campaign?.name ?? '',
    slug: campaign?.slug ?? '',
    status: campaign?.status ?? 'DRAFT',
    startsAt: toLocalInput(campaign?.startsAt),
    endsAt: toLocalInput(campaign?.endsAt),
    headline: campaign?.content.headline ?? '',
    body: campaign?.content.body ?? '',
    heroImage: campaign?.content.heroImage ?? null as string | null,
    couponCode: campaign?.content.couponCode ?? '',
    productIds: campaign?.content.productIds ?? [] as string[],
  });
  const [slugTouched, setSlugTouched] = useState(Boolean(campaign));
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const fe = saver.fields ?? {};
  const ok = f.name.trim().length >= 2 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(f.slug) && f.headline.trim().length >= 2;

  return (
    <form className="panel mb-6 space-y-5 p-5" onSubmit={async (e) => {
      e.preventDefault();
      const body = { ...f, startsAt: fromLocalInput(f.startsAt), endsAt: fromLocalInput(f.endsAt), couponCode: f.couponCode || null };
      if (await saver.run(() => marketingApi.saveCampaign(campaign?.id ?? null, body), 'Campaign saved')) onDone();
    }}>
      <h2 className="text-xl">{campaign ? `Edit ${campaign.name}` : 'New campaign'}</h2>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="cn" label="Name (staff only)"><input id="cn" className="field" value={f.name} onChange={(e) => { set('name', e.target.value); if (!slugTouched) set('slug', slugify(e.target.value)); }} /></Field>
        <Field id="cs" label="Web address" hint={`/promotions/${f.slug || '…'}`} error={fe.slug}><input id="cs" className="field" value={f.slug} onChange={(e) => { setSlugTouched(true); set('slug', e.target.value); }} /></Field>
        <Field id="ch" label="Headline" className="sm:col-span-2"><input id="ch" className="field" maxLength={160} value={f.headline} onChange={(e) => set('headline', e.target.value)} /></Field>
        <Field id="cb" label="Text" className="sm:col-span-2"><textarea id="cb" className="field min-h-24" maxLength={4000} value={f.body} onChange={(e) => set('body', e.target.value)} /></Field>
        <ImageField id="chi" label="Main image" value={f.heroImage} onChange={(v) => set('heroImage', v)} hint="About 4:3." />
        <Field id="cc" label="Coupon code to show (optional)" hint="Create the coupon on the Coupons page first." error={fe.couponCode}>
          <input id="cc" className="field font-mono uppercase" value={f.couponCode} onChange={(e) => set('couponCode', e.target.value.toUpperCase().replace(/\s/g, ''))} />
        </Field>
        <Field id="cst" label="Starts (Ghana time)"><input id="cst" type="datetime-local" className="field" value={f.startsAt} onChange={(e) => set('startsAt', e.target.value)} /></Field>
        <Field id="cen" label="Ends (Ghana time)" error={fe.endsAt}><input id="cen" type="datetime-local" className="field" value={f.endsAt} onChange={(e) => set('endsAt', e.target.value)} /></Field>
        <Field id="cstat" label="Status">
          <select id="cstat" className="field" value={f.status} onChange={(e) => set('status', e.target.value as typeof f.status)}>
            <option value="DRAFT">Draft (staff can preview)</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </Field>
      </div>
      <ProductPicker value={f.productIds} onChange={(v) => set('productIds', v)} />
      <div className="flex items-center gap-3">
        <button className="btn btn-primary" disabled={!ok || saver.saving}>Save campaign</button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <SaveStatus status={saver.status} message={saver.message} />
      </div>
    </form>
  );
}

function ProductPicker({ value, onChange }: { value: string[]; onChange: (ids: string[]) => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<AdminProduct[]>([]);
  const [known, setKnown] = useState<Record<string, string>>({});
  useLoad(async () => {
    if (!value.length) return;
    const all = await adminApi.products({ limit: 100, status: 'PUBLISHED' });
    setKnown((k) => ({ ...k, ...Object.fromEntries(all.items.map((p) => [p.id, p.name])) }));
  }, []);

  const search = async () => {
    const r = await adminApi.products({ q: q || undefined, status: 'PUBLISHED', limit: 10 });
    setResults(r.items);
    setKnown((k) => ({ ...k, ...Object.fromEntries(r.items.map((p) => [p.id, p.name])) }));
  };
  const move = (i: number, dir: -1 | 1) => { const n = [...value]; [n[i], n[i + dir]] = [n[i + dir], n[i]]; onChange(n); };

  return (
    <fieldset>
      <legend className="label">Products on the page ({value.length})</legend>
      {value.length > 0 && (
        <ol className="mb-3 space-y-1 text-sm">
          {value.map((id, i) => (
            <li key={id} className="flex items-center gap-3">
              <span className="flex-1">{known[id] ?? 'Product'}</span>
              <button type="button" className="underline disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)}>Up</button>
              <button type="button" className="text-danger underline" onClick={() => onChange(value.filter((x) => x !== id))}>Remove</button>
            </li>
          ))}
        </ol>
      )}
      <div className="flex gap-2">
        <label htmlFor="pp-q" className="sr-only">Search published products</label>
        <input id="pp-q" className="field max-w-xs" placeholder="Search products" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); search(); } }} />
        <button type="button" className="btn btn-secondary" onClick={search}>Search</button>
      </div>
      {results.length > 0 && (
        <ul className="mt-2 max-w-md divide-y divide-flour rounded-sm border border-flour text-sm">
          {results.map((p) => (
            <li key={p.id} className="flex items-center justify-between px-3 py-2">
              <span>{p.name}</span>
              {value.includes(p.id) ? <span className="text-muted">Added</span> : <button type="button" className="underline" onClick={() => onChange([...value, p.id])}>Add</button>}
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  );
}
