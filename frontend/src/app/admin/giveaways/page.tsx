'use client';

import { useState } from 'react';
import { ImageField, fromLocalInput, shortWhen, toLocalInput } from '@/components/admin/ImageField';
import { Field, PageHeader, SaveStatus, Table } from '@/components/admin/ui';
import { ErrorState } from '@/components/support/ErrorState';
import { Skeleton } from '@/components/support/Skeleton';
import { slugify } from '@/lib/api/admin';
import { marketingApi, type AdminGiveaway } from '@/lib/api/marketing';
import { useLoad, useSaver } from '@/hooks/use-load';
import { useSession } from '@/stores/session-store';

const RULES_TEMPLATE = `Who can enter: customers aged 18 or over with an account on our shop. Staff and their families can't enter.
How to enter: sign in and press "Enter the giveaway" before the closing time. Entries per person are limited as shown on the page.
How the winner is chosen: one entry is picked at random by computer after the giveaway closes. Each entry counts once.
Prize: as described. No cash alternative. We'll contact the winner by email; if they don't reply within 7 days we may pick another winner.
We will never ask you to pay or share a PIN to claim a prize.
Your data: we use your name and email only to run this giveaway and contact the winner. The winner's first name and last initial are shown on this page. Entries are deleted 90 days after the draw.`;

export default function GiveawaysAdminPage() {
  const list = useLoad(() => marketingApi.giveaways(), []);
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  if (list.error) return <ErrorState message={list.error.message} onRetry={list.reload} />;
  if (!list.data) return <Skeleton className="h-64" />;
  const done = () => { setEditing(null); list.reload(); };

  return (
    <>
      <PageHeader
        title="Giveaways"
        description="Signed-in customers enter on the giveaway page. After it closes, draw a winner at random here; the draw is recorded in the activity log."
        actions={editing !== 'new' && <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>New giveaway</button>}
      />
      {editing === 'new' && <GiveawayEditor onDone={done} onCancel={() => setEditing(null)} />}
      <Table caption="Giveaways">
        <thead><tr><th>Giveaway</th><th>Open</th><th className="text-right">Entries</th><th>Winner</th><th /></tr></thead>
        <tbody>
          {list.data.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-muted">No giveaways yet.</td></tr>}
          {list.data.map((g) => editing === g.id ? (
            <tr key={g.id}><td colSpan={5} className="!p-0"><GiveawayEditor giveaway={g} onDone={done} onCancel={() => setEditing(null)} /></td></tr>
          ) : (
            <tr key={g.id}>
              <td>{g.title}<span className="block text-xs text-muted">{g.status.toLowerCase()}, /giveaways/{g.slug}</span></td>
              <td className="whitespace-nowrap text-xs">{shortWhen(g.opensAt)} to {shortWhen(g.closesAt)}</td>
              <td className="text-right">{g.entries}<span className="block text-xs text-muted">{g.entrants} people</span></td>
              <td><DrawCell g={g} onDrawn={list.reload} /></td>
              <td className="text-right"><button type="button" className="text-sm underline" onClick={() => setEditing(g.id)}>Edit</button></td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}

function DrawCell({ g, onDrawn }: { g: AdminGiveaway; onDrawn: () => void }) {
  const saver = useSaver();
  const isAdmin = useSession((s) => s.user?.role === 'ADMIN');
  const [reason, setReason] = useState('');
  const [redrawing, setRedrawing] = useState(false);
  const closed = new Date(g.closesAt).getTime() <= Date.now();

  if (g.winner) {
    return (
      <div className="text-sm">
        <p className="font-semibold">{g.winner.name}</p>
        <p className="text-xs">{g.winner.email}{g.winner.phone ? `, ${g.winner.phone}` : ''}</p>
        <p className="text-xs text-muted">Shown as “{g.winnerDisplayName}”. Emailed {g.winnerDrawnAt ? shortWhen(g.winnerDrawnAt) : ''}.</p>
        {isAdmin && !redrawing && <button type="button" className="mt-1 text-xs underline" onClick={() => setRedrawing(true)}>Winner didn’t respond? Redraw</button>}
        {redrawing && (
          <div className="mt-2 flex gap-2">
            <label htmlFor={`rr-${g.id}`} className="sr-only">Reason for redraw</label>
            <input id={`rr-${g.id}`} className="field w-48" placeholder="Reason, e.g. no reply in 7 days" value={reason} onChange={(e) => setReason(e.target.value)} />
            <button type="button" className="btn btn-secondary" disabled={reason.trim().length < 3 || saver.saving} onClick={async () => { if (await saver.run(() => marketingApi.redraw(g.id, reason))) { setRedrawing(false); onDrawn(); } }}>Redraw</button>
          </div>
        )}
        <SaveStatus status={saver.status} message={saver.message} />
      </div>
    );
  }
  if (!closed) return <span className="text-sm text-muted">After it closes</span>;
  return (
    <div>
      <button type="button" className="btn btn-primary" disabled={!g.entries || saver.saving} onClick={async () => { if (await saver.run(() => marketingApi.draw(g.id), 'Winner drawn and emailed')) onDrawn(); }}>
        Draw winner
      </button>
      {!g.entries && <p className="text-xs text-muted">No entries</p>}
      <SaveStatus status={saver.status} message={saver.message} />
    </div>
  );
}

function GiveawayEditor({ giveaway, onDone, onCancel }: { giveaway?: AdminGiveaway; onDone: () => void; onCancel: () => void }) {
  const saver = useSaver();
  const [f, setF] = useState({
    title: giveaway?.title ?? '',
    slug: giveaway?.slug ?? '',
    prize: giveaway?.prize ?? '',
    description: giveaway?.description ?? '',
    imageUrl: giveaway?.imageUrl ?? null as string | null,
    rules: giveaway?.rules ?? RULES_TEMPLATE,
    status: giveaway?.status ?? 'DRAFT',
    opensAt: toLocalInput(giveaway?.opensAt),
    closesAt: toLocalInput(giveaway?.closesAt),
    entryLimit: String(giveaway?.entryLimit ?? 1),
  });
  const [slugTouched, setSlugTouched] = useState(Boolean(giveaway));
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const fe = saver.fields ?? {};
  const ok = f.title.trim().length >= 2 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(f.slug) && f.prize.trim().length >= 2 && f.description.trim().length >= 10 && f.rules.trim().length >= 50 && f.opensAt && f.closesAt && f.closesAt > f.opensAt;

  return (
    <form className="panel mb-6 space-y-5 p-5" onSubmit={async (e) => {
      e.preventDefault();
      const body = { ...f, entryLimit: Number(f.entryLimit) || 1, opensAt: fromLocalInput(f.opensAt), closesAt: fromLocalInput(f.closesAt) };
      if (await saver.run(() => marketingApi.saveGiveaway(giveaway?.id ?? null, body), 'Giveaway saved')) onDone();
    }}>
      <h2 className="text-xl">{giveaway ? `Edit ${giveaway.title}` : 'New giveaway'}</h2>
      {giveaway?.winnerDrawnAt && <p className="text-sm text-muted">A winner has been drawn, so the dates and entry limit are fixed.</p>}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="gt" label="Title"><input id="gt" className="field" value={f.title} onChange={(e) => { set('title', e.target.value); if (!slugTouched) set('slug', slugify(e.target.value)); }} /></Field>
        <Field id="gs" label="Web address" hint={`/giveaways/${f.slug || '…'}`} error={fe.slug}><input id="gs" className="field" value={f.slug} onChange={(e) => { setSlugTouched(true); set('slug', e.target.value); }} /></Field>
        <Field id="gp" label="Prize"><input id="gp" className="field" value={f.prize} onChange={(e) => set('prize', e.target.value)} placeholder="e.g. A 2-tier celebration cake" /></Field>
        <ImageField id="gi" label="Image" value={f.imageUrl} onChange={(v) => set('imageUrl', v)} />
        <Field id="gd" label="Description" className="sm:col-span-2" error={fe.description}><textarea id="gd" className="field min-h-20" value={f.description} onChange={(e) => set('description', e.target.value)} /></Field>
        <Field id="go" label="Opens (Ghana time)"><input id="go" type="datetime-local" className="field" disabled={Boolean(giveaway?.winnerDrawnAt)} value={f.opensAt} onChange={(e) => set('opensAt', e.target.value)} /></Field>
        <Field id="gc" label="Closes (Ghana time)" error={f.closesAt && f.opensAt && f.closesAt <= f.opensAt ? 'Must be after it opens.' : fe.closesAt}><input id="gc" type="datetime-local" className="field" disabled={Boolean(giveaway?.winnerDrawnAt)} value={f.closesAt} onChange={(e) => set('closesAt', e.target.value)} /></Field>
        <Field id="gl" label="Entries per customer"><input id="gl" className="field w-24" inputMode="numeric" disabled={Boolean(giveaway?.winnerDrawnAt)} value={f.entryLimit} onChange={(e) => set('entryLimit', e.target.value.replace(/\D/g, ''))} /></Field>
        <Field id="gst" label="Status">
          <select id="gst" className="field" value={f.status} onChange={(e) => set('status', e.target.value as typeof f.status)}>
            <option value="DRAFT">Draft (hidden)</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </Field>
        <Field id="gr" label="Rules and privacy statement" hint="Shown on the giveaway page. Edit the template to fit, and have it checked before publishing." error={fe.rules} className="sm:col-span-2">
          <textarea id="gr" className="field min-h-48 text-sm" value={f.rules} onChange={(e) => set('rules', e.target.value)} />
        </Field>
      </div>
      <div className="flex items-center gap-3">
        <button className="btn btn-primary" disabled={!ok || saver.saving}>Save giveaway</button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <SaveStatus status={saver.status} message={saver.message} />
      </div>
    </form>
  );
}
