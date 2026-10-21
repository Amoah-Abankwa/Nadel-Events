'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { useState } from 'react';
import { ErrorState } from '@/components/support/ErrorState';
import { Skeleton } from '@/components/support/Skeleton';
import type { ApiError } from '@/lib/api/errors';
import { marketingApi } from '@/lib/api/marketing';
import { useLoad } from '@/hooks/use-load';
import { useSession } from '@/stores/session-store';
import { loginHref } from '@/lib/site-links';

const when = (iso: string) => new Date(iso).toLocaleString('en-GH', { dateStyle: 'long', timeStyle: 'short', timeZone: 'UTC' });

export default function GiveawayPage() {
  const { slug } = useParams<{ slug: string }>();
  const pathname = usePathname();
  const user = useSession((s) => s.user);
  const { data: g, error, reload } = useLoad(() => marketingApi.giveaway(slug), [slug, user?.id]);
  const [accept, setAccept] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>();
  const [err, setErr] = useState<string>();

  if (error) return <ErrorState message={error.message} onRetry={reload} />;
  if (!g) return <Skeleton className="h-96" />;

  const left = (g.entryLimit ?? 1) - (g.myEntries ?? 0);

  return (
    <article className="grid gap-10 md:grid-cols-2">
      <div>
        {g.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={g.imageUrl} alt="" className="aspect-square w-full rounded-md border border-flour object-cover" />
        )}
      </div>
      <div>
        <h1 className="text-4xl">{g.title}</h1>
        <p className="mt-2 text-lg">Prize: <strong>{g.prize}</strong></p>
        <p className="mt-4 whitespace-pre-line text-muted">{g.description}</p>
        <p className="mt-4 text-sm">{g.state === 'UPCOMING' ? `Opens ${when(g.opensAt)}.` : g.state === 'OPEN' ? `Closes ${when(g.closesAt)} (Ghana time).` : `Closed ${when(g.closesAt)}.`}</p>

        <div className="panel mt-6 p-5" aria-live="polite">
          {g.state === 'CLOSED' ? (
            g.winner ? <p>Winner: <strong>{g.winner}</strong>.{g.isWinner && ' That’s you! Check your email for how to claim.'}</p> : <p>Entries are closed. We’ll announce the winner here soon.</p>
          ) : g.state === 'UPCOMING' ? (
            <p>Entries open {when(g.opensAt)}.</p>
          ) : !user ? (
            <Link href={loginHref(pathname)} className="btn btn-primary">Sign in to enter</Link>
          ) : left <= 0 ? (
            <p>You’re entered{(g.entryLimit ?? 1) > 1 ? ` (${g.myEntries} entries)` : ''}. Good luck!</p>
          ) : (
            <>
              {(g.myEntries ?? 0) > 0 && <p className="mb-3 text-sm">You have {g.myEntries} of {g.entryLimit} entries.</p>}
              <label className="flex gap-3 text-sm">
                <input type="checkbox" className="mt-1 size-4 accent-burgundy" checked={accept} onChange={(e) => setAccept(e.target.checked)} />
                <span>I’ve read and accept the rules below, including how my details are used.</span>
              </label>
              <button type="button" className="btn btn-primary mt-4" disabled={!accept || busy} onClick={async () => {
                setBusy(true); setErr(undefined);
                try {
                  const r = await marketingApi.enter(slug);
                  setMsg(r.myEntries >= r.entryLimit ? 'You’re entered. Good luck!' : `Entry ${r.myEntries} of ${r.entryLimit} recorded.`);
                  await reload();
                } catch (e) { setErr((e as ApiError).message); }
                setBusy(false);
              }}>Enter the giveaway</button>
            </>
          )}
          {msg && <p className="mt-3 text-sm text-success">{msg}</p>}
          {err && <p className="mt-3 text-sm text-danger">{err}</p>}
        </div>

        {g.rules && (
          <details className="mt-6">
            <summary className="cursor-pointer font-semibold">Rules and privacy</summary>
            <div className="mt-3 whitespace-pre-line text-sm leading-relaxed">{g.rules}</div>
          </details>
        )}
      </div>
    </article>
  );
}
