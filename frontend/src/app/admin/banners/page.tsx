'use client';

import { useState } from 'react';
import { ImageField, fromLocalInput, liveState, shortWhen, toLocalInput } from '@/components/admin/ImageField';
import { Field, PageHeader, SaveStatus, Table, Toggle } from '@/components/admin/ui';
import { ErrorState } from '@/components/support/ErrorState';
import { Skeleton } from '@/components/support/Skeleton';
import { PLACEMENTS, marketingApi, type AdminBanner, type AdminCampaign } from '@/lib/api/marketing';
import { useLoad, useSaver } from '@/hooks/use-load';

const placementLabel = (p: string) => PLACEMENTS.find((x) => x.value === p)?.label ?? p;

export default function BannersPage() {
  const banners = useLoad(() => marketingApi.banners(), []);
  const campaigns = useLoad(() => marketingApi.campaigns(), []);
  const [editing, setEditing] = useState<string | 'new' | null>(null);

  if (banners.error) return <ErrorState message={banners.error.message} onRetry={banners.reload} />;
  if (!banners.data) return <Skeleton className="h-64" />;
  const done = () => { setEditing(null); banners.reload(); };

  return (
    <>
      <PageHeader
        title="Banners and ad spots"
        description="Image banners shown in fixed spots around the shop. The highest priority live banner shows first. Mark paid placements as sponsored so customers can tell."
        actions={editing !== 'new' && <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>New banner</button>}
      />
      {editing === 'new' && <BannerEditor campaigns={campaigns.data ?? []} onDone={done} onCancel={() => setEditing(null)} />}
      <Table caption="Banners">
        <thead><tr><th>Banner</th><th>Spot</th><th>When</th><th className="text-right">Clicks</th><th>Status</th><th /></tr></thead>
        <tbody>
          {banners.data.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-muted">No banners yet.</td></tr>}
          {banners.data.map((b) => editing === b.id ? (
            <tr key={b.id}><td colSpan={6} className="!p-0"><BannerEditor banner={b} campaigns={campaigns.data ?? []} onDone={done} onCancel={() => setEditing(null)} /></td></tr>
          ) : (
            <tr key={b.id}>
              <td>
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.desktopImage} alt="" className="h-10 w-28 rounded-sm border border-flour object-cover" />
                  <span>{b.title}{b.isSponsored && <span className="block text-xs text-muted">Sponsored</span>}</span>
                </div>
              </td>
              <td className="text-xs">{placementLabel(b.placement)}</td>
              <td className="whitespace-nowrap text-xs">{b.startsAt || b.endsAt ? `${b.startsAt ? shortWhen(b.startsAt) : 'Now'} to ${b.endsAt ? shortWhen(b.endsAt) : 'no end'}` : 'Always'}</td>
              <td className="text-right">{b.clicks}</td>
              <td>{liveState(b)}</td>
              <td className="text-right"><button type="button" className="text-sm underline" onClick={() => setEditing(b.id)}>Edit</button></td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}

function BannerEditor({ banner, campaigns, onDone, onCancel }: { banner?: AdminBanner; campaigns: AdminCampaign[]; onDone: () => void; onCancel: () => void }) {
  const saver = useSaver();
  const [f, setF] = useState({
    title: banner?.title ?? '',
    desktopImage: banner?.desktopImage ?? null as string | null,
    mobileImage: banner?.mobileImage ?? null as string | null,
    altText: banner?.altText ?? '',
    placement: banner?.placement ?? 'home.feature',
    destinationUrl: banner?.destinationUrl ?? '/',
    isSponsored: banner?.isSponsored ?? false,
    priority: String(banner?.priority ?? 0),
    status: banner?.status ?? 'DRAFT',
    startsAt: toLocalInput(banner?.startsAt),
    endsAt: toLocalInput(banner?.endsAt),
    campaignId: banner?.campaignId ?? '',
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const fe = saver.fields ?? {};
  const ok = f.title.trim().length >= 2 && f.desktopImage && f.altText.trim().length >= 3 && /^(\/|https:\/\/)/.test(f.destinationUrl);

  return (
    <form className="panel mb-6 space-y-5 p-5" onSubmit={async (e) => {
      e.preventDefault();
      const body = { ...f, priority: Number(f.priority) || 0, startsAt: fromLocalInput(f.startsAt), endsAt: fromLocalInput(f.endsAt), campaignId: f.campaignId || null };
      if (await saver.run(() => marketingApi.saveBanner(banner?.id ?? null, body), 'Banner saved')) onDone();
    }}>
      <h2 className="text-xl">{banner ? `Edit “${banner.title}”` : 'New banner'}</h2>
      <div className="grid gap-5 sm:grid-cols-2">
        <ImageField id="bd" label="Desktop image" required value={f.desktopImage} onChange={(v) => set('desktopImage', v)} hint="Wide image, about 4:1 (e.g. 1600 × 400). Strip spot: about 8:1." />
        <ImageField id="bm" label="Phone image" value={f.mobileImage} onChange={(v) => set('mobileImage', v)} hint="Optional. Taller crop for small screens, about 3:1." />
        <Field id="bt" label="Name (staff only)" error={fe.title}><input id="bt" className="field" value={f.title} onChange={(e) => set('title', e.target.value)} /></Field>
        <Field id="ba" label="Image description" hint="What the image shows, for screen readers. Include any text that’s in the image." error={fe.altText}>
          <input id="ba" className="field" value={f.altText} onChange={(e) => set('altText', e.target.value)} />
        </Field>
        <Field id="bp" label="Spot">
          <select id="bp" className="field" value={f.placement} onChange={(e) => set('placement', e.target.value)}>
            {PLACEMENTS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </Field>
        <Field id="bu" label="Link to" hint="A page on your shop, e.g. /promotions/easter, or a full https link." error={fe.destinationUrl}>
          <input id="bu" className="field" value={f.destinationUrl} onChange={(e) => set('destinationUrl', e.target.value.trim())} />
        </Field>
        <Field id="bs" label="Starts (Ghana time)" hint="Empty = when published."><input id="bs" type="datetime-local" className="field" value={f.startsAt} onChange={(e) => set('startsAt', e.target.value)} /></Field>
        <Field id="be" label="Ends (Ghana time)" hint="Empty = no end." error={fe.endsAt}><input id="be" type="datetime-local" className="field" value={f.endsAt} onChange={(e) => set('endsAt', e.target.value)} /></Field>
        <Field id="bpr" label="Priority" hint="Higher shows first when several are live."><input id="bpr" className="field w-24" inputMode="numeric" value={f.priority} onChange={(e) => set('priority', e.target.value.replace(/\D/g, ''))} /></Field>
        <Field id="bc" label="Part of campaign (optional)">
          <select id="bc" className="field" value={f.campaignId} onChange={(e) => set('campaignId', e.target.value)}>
            <option value="">None</option>
            {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field id="bst" label="Status">
          <select id="bst" className="field" value={f.status} onChange={(e) => set('status', e.target.value as typeof f.status)}>
            <option value="DRAFT">Draft (hidden)</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </Field>
        <div className="self-end"><Toggle id="bsp" label="Sponsored (paid placement)" checked={f.isSponsored} onChange={(v) => set('isSponsored', v)} /></div>
      </div>
      <div className="flex items-center gap-3">
        <button className="btn btn-primary" disabled={!ok || saver.saving}>Save banner</button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <SaveStatus status={saver.status} message={saver.message} />
      </div>
    </form>
  );
}
