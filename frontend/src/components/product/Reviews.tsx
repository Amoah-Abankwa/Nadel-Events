'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ErrorState } from '@/components/support/ErrorState';
import type { ApiError } from '@/lib/api/errors';
import { reviewsApi } from '@/lib/api/reviews';
import { formatDate } from '@/lib/format';
import { useLoad } from '@/hooks/use-load';
import { useSession } from '@/stores/session-store';
import { Stars } from './Stars';
import { loginHref } from '@/lib/site-links';

export function Reviews({ slug, productName, embedded = false, startWriting = false }: { slug: string; productName: string; embedded?: boolean; startWriting?: boolean }) {
  const pathname = usePathname();
  const user = useSession((s) => s.user);
  const [page, setPage] = useState(1);
  const { data, error, reload } = useLoad(() => reviewsApi.list(slug, page), [slug, page, user?.id]);
  const [writing, setWriting] = useState(false);
  useEffect(() => {
    if (startWriting && data?.canReview) setWriting(true);
  }, [startWriting, data?.canReview]);

  return (
    <section aria-labelledby="reviews-h" className={embedded ? '' : 'mt-20 border-t border-flour pt-12'}>
      <h2 id="reviews-h" className={embedded ? 'sr-only' : 'text-3xl'}>Reviews</h2>
      {error && <div className="mt-4"><ErrorState message={error.message} onRetry={reload} /></div>}
      {data && (
        <div className={`grid gap-10 md:grid-cols-[14rem_1fr] ${embedded ? '' : 'mt-6'}`}>
          <div>
            {data.summary.count > 0 ? (
              <>
                <p className="font-display text-5xl text-cocoa">{data.summary.average?.toFixed(1)}</p>
                <Stars value={data.summary.average ?? 0} size={18} />
                <p className="mt-1 text-sm text-muted">{data.summary.count} review{data.summary.count === 1 ? '' : 's'}</p>
                <ul className="mt-4 space-y-1 text-sm">
                  {data.summary.distribution.map((d) => (
                    <li key={d.star} className="flex items-center gap-2">
                      <span className="w-12">{d.star} star</span>
                      <span className="h-2 flex-1 rounded-sm bg-flour" aria-hidden>
                        <span className="block h-2 rounded-sm bg-caramel" style={{ width: `${(d.count / data.summary.count) * 100}%` }} />
                      </span>
                      <span className="w-6 text-right text-muted">{d.count}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-muted">No reviews yet.</p>
            )}

            <div className="mt-6">
              {!user ? (
                <Link href={loginHref(pathname)} className="btn btn-secondary">Sign in to review</Link>
              ) : data.mine && !writing ? (
                <div className="text-sm">
                  <p>Your review {data.mine.status === 'PENDING' ? 'is waiting for approval.' : data.mine.status === 'APPROVED' ? 'is live.' : 'wasn’t published.'}</p>
                  <button type="button" className="mt-1 underline" onClick={() => setWriting(true)}>Edit your review</button>
                </div>
              ) : data.canReview ? (
                !writing && <button type="button" className="btn btn-secondary" onClick={() => setWriting(true)}>Write a review</button>
              ) : (
                data.requirePurchase && <p className="text-sm text-muted">Only customers who bought this can review it.</p>
              )}
            </div>
          </div>

          <div>
            {writing && <ReviewForm slug={slug} productName={productName} initial={data.mine} onDone={() => { setWriting(false); reload(); }} onCancel={() => setWriting(false)} />}
            <ul className="divide-y divide-flour">
              {data.items.map((r) => (
                <li key={r.id} className="py-5">
                  <Stars value={r.rating} />
                  {r.title && <p className="mt-1 font-semibold">{r.title}</p>}
                  <p className="mt-1 max-w-prose whitespace-pre-line">{r.body}</p>
                  <p className="mt-2 text-xs text-muted">{r.author}{r.verifiedPurchase ? ', verified buyer' : ''}, {formatDate(r.createdAt)}</p>
                </li>
              ))}
            </ul>
            {data.totalPages > 1 && (
              <div className="mt-4 flex gap-3 text-sm">
                <button type="button" className="btn btn-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Newer</button>
                <button type="button" className="btn btn-secondary" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>Older</button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function ReviewForm({ slug, productName, initial, onDone, onCancel }: { slug: string; productName: string; initial: { rating: number; title: string | null; body: string } | null; onDone: () => void; onCancel: () => void }) {
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [body, setBody] = useState(initial?.body ?? '');
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form className="panel mb-8 space-y-4 p-5" onSubmit={async (e) => {
      e.preventDefault();
      setBusy(true);
      setError(null);
      try {
        await reviewsApi.save(slug, { rating, title: title || undefined, body });
        onDone();
      } catch (err) {
        setError(err as ApiError);
        setBusy(false);
      }
    }}>
      <h3 className="font-sans text-base font-semibold text-charcoal">Review {productName}</h3>
      <fieldset>
        <legend className="label">Your rating</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-burgundy">
              <input type="radio" name="rating" value={n} checked={rating === n} onChange={() => setRating(n)} className="sr-only" />
              <span className="sr-only">{n} star{n === 1 ? '' : 's'}</span>
              <svg aria-hidden width="28" height="28" viewBox="0 0 24 24"><path fill={n <= rating ? 'var(--color-caramel)' : 'var(--color-crust)'} d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8z" /></svg>
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="rt" className="label">Headline (optional)</label>
        <input id="rt" className="field" maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <label htmlFor="rb" className="label">Your review</label>
        <textarea id="rb" className="field min-h-28" maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)} />
        <p className="mt-1 text-xs text-muted">Reviews are checked before they appear. Please don’t include phone numbers or addresses.</p>
      </div>
      {error && <ErrorState message={error.message} />}
      <div className="flex gap-3">
        <button className="btn btn-primary" disabled={busy || !rating || body.trim().length < 10}>{initial ? 'Update review' : 'Submit review'}</button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
