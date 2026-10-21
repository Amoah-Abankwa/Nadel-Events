'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { ErrorState } from '@/components/support/ErrorState';
import { Skeleton } from '@/components/support/Skeleton';
import type { ApiError } from '@/lib/api/errors';
import { FULFILMENT_LABEL, REQUEST_STATUS_LABEL, requestsApi } from '@/lib/api/requests';
import { formatMoney } from '@/lib/format';
import { useLoad } from '@/hooks/use-load';

const longDate = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

function RequestDetail() {
  const { ref } = useParams<{ ref: string }>();
  const justSent = useSearchParams().get('sent') === '1';
  const { data: r, error, reload } = useLoad(() => requestsApi.one(ref), [ref]);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string>();
  const [confirmDecline, setConfirmDecline] = useState<'decline' | 'cancel' | null>(null);
  const [reason, setReason] = useState('');

  if (error) return <ErrorState message={error.message} onRetry={reload} />;
  if (!r) return <Skeleton className="h-64" />;

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setActionError(undefined);
    try {
      await fn();
      setConfirmDecline(null);
      setReason('');
      await reload();
    } catch (e) {
      setActionError((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  };

  const goPay = async (fn: () => Promise<{ checkoutUrl: string } | undefined>) => {
    setBusy(true);
    setActionError(undefined);
    try {
      const p = await fn();
      if (p) window.location.assign(p.checkoutUrl);
      else { await reload(); setBusy(false); }
    } catch (e) {
      setActionError((e as ApiError).message);
      setBusy(false);
    }
  };

  const accept = () =>
    goPay(async () => {
      const res = await requestsApi.accept(r.reference);
      if (res.paymentError) setActionError(res.paymentError);
      return res.payment;
    });

  return (
    <article>
      <Link href="/account/requests" className="text-sm underline underline-offset-2">All requests</Link>
      <h1 className="mt-4 text-4xl">{r.service.name}</h1>
      <p className="mt-2 text-muted">{longDate(r.eventDate)}. Reference {r.reference}.</p>

      {justSent && r.status === 'SUBMITTED' && (
        <p role="status" className="mt-6 rounded-md border border-success/40 bg-success/5 p-4">Request sent. We’ll email you a quote, usually within a working day.</p>
      )}

      <section aria-labelledby="status-h" className="panel mt-8 p-6">
        <h2 id="status-h" className="text-2xl">{REQUEST_STATUS_LABEL[r.status]}</h2>

        {r.status === 'SUBMITTED' && <p className="mt-2 text-muted">We’re looking at your request and will send a quote soon.</p>}

        {r.quote && ['QUOTED', 'ACCEPTED', 'CONFIRMED', 'COMPLETED', 'DECLINED'].includes(r.status) && (
          <>
            <dl className="mt-4 max-w-sm space-y-1">
              <div className="flex justify-between"><dt>Total</dt><dd className="font-semibold">{formatMoney(r.quote.amount)}</dd></div>
              {Number(r.quote.deposit) > 0 && <div className="flex justify-between"><dt>Deposit {r.depositPaidAt ? '(paid)' : 'to book'}</dt><dd>{formatMoney(r.quote.deposit)}</dd></div>}
              {Number(r.quote.deposit) > 0 && <div className="flex justify-between text-sm text-muted"><dt>Balance on collection or delivery</dt><dd>{formatMoney(r.quote.balance)}</dd></div>}
            </dl>
            {r.quote.note && <p className="mt-4 max-w-prose whitespace-pre-line text-sm">{r.quote.note}</p>}
            {r.status === 'QUOTED' && r.quote.validUntil && (
              <p className={`mt-4 text-sm ${r.quote.expired ? 'text-danger' : 'text-muted'}`}>
                {r.quote.expired ? 'This quote has expired. Message us for a fresh one.' : `Valid until ${longDate(r.quote.validUntil)}.`}
              </p>
            )}
          </>
        )}

        {r.status === 'ACCEPTED' && <p className="mt-4">Pay the deposit to lock in your date. Your date isn’t reserved until it’s paid.</p>}
        {r.status === 'CONFIRMED' && <p className="mt-4">Your date is booked. We’ll be in touch about final details before the event.</p>}
        {r.closedReason && ['REJECTED', 'CANCELLED', 'DECLINED'].includes(r.status) && <p className="mt-3 text-muted">{r.closedReason}</p>}

        <div className="mt-6 flex flex-wrap gap-3">
          {r.actions.accept && (
            <button type="button" className="btn btn-primary" disabled={busy} onClick={accept}>
              {Number(r.quote?.deposit ?? 0) > 0 ? `Accept and pay ${formatMoney(r.quote!.deposit)} deposit` : 'Accept quote'}
            </button>
          )}
          {r.actions.payDeposit && (
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => goPay(() => requestsApi.payDeposit(r.reference))}>
              Pay {formatMoney(r.quote?.deposit ?? '0')} deposit
            </button>
          )}
          {r.actions.decline && <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => setConfirmDecline('decline')}>Decline quote</button>}
          {r.actions.cancel && <button type="button" className="text-sm text-muted underline" disabled={busy} onClick={() => setConfirmDecline('cancel')}>Cancel request</button>}
        </div>

        {confirmDecline && (
          <div className="mt-5 max-w-md rounded-md border border-crust p-4">
            <label htmlFor="reason" className="label">{confirmDecline === 'decline' ? 'Anything we should change? (optional)' : 'Reason (optional)'}</label>
            <textarea id="reason" className="field min-h-20" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
            <div className="mt-3 flex gap-3">
              <button type="button" className="btn btn-primary" disabled={busy}
                onClick={() => run(() => (confirmDecline === 'decline' ? requestsApi.decline(r.reference, reason || undefined) : requestsApi.cancel(r.reference, reason || undefined)))}>
                {confirmDecline === 'decline' ? 'Decline quote' : 'Cancel request'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setConfirmDecline(null)}>Keep it</button>
            </div>
          </div>
        )}
        {actionError && <div className="mt-4"><ErrorState message={actionError} /></div>}
      </section>

      <section aria-labelledby="details-h" className="mt-10">
        <h2 id="details-h" className="text-2xl">Your request</h2>
        <dl className="mt-4 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
          <div><dt className="text-muted">Guests or servings</dt><dd>{r.guestCount ?? 'Not given'}</dd></div>
          <div><dt className="text-muted">Budget</dt><dd>{r.budget ? formatMoney(r.budget) : 'Not given'}</dd></div>
          <div><dt className="text-muted">Getting it to you</dt><dd>{FULFILMENT_LABEL[r.fulfilmentPreference]}{r.location ? `: ${r.location}` : ''}</dd></div>
          <div><dt className="text-muted">Phone</dt><dd>{r.contactPhone}</dd></div>
          <div className="sm:col-span-2"><dt className="text-muted">Details</dt><dd className="whitespace-pre-line">{r.notes}</dd></div>
        </dl>
        {r.images.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-3">
            {r.images.map((src, i) => (
              <li key={i}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`Reference photo ${i + 1}`} className="size-28 rounded-sm border border-flour object-cover" />
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}

export default function RequestPage() {
  return <Suspense fallback={<Skeleton className="h-64" />}><RequestDetail /></Suspense>;
}
