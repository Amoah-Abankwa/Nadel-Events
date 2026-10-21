'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Field, PageHeader, SaveStatus, StatusBadge } from '@/components/admin/ui';
import { ErrorState } from '@/components/support/ErrorState';
import { Skeleton } from '@/components/support/Skeleton';
import { MONEY_RE } from '@/lib/api/admin';
import { FULFILMENT_LABEL, REQUEST_STATUS_LABEL, requestsApi, type StaffRequestView } from '@/lib/api/requests';
import { formatDate, formatMoney, whatsAppTo } from '@/lib/format';
import { useLoad, useSaver } from '@/hooks/use-load';

const longDate = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const plusDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

export default function AdminRequestPage() {
  const { ref } = useParams<{ ref: string }>();
  const { data: r, error, reload } = useLoad(() => requestsApi.adminGet(ref), [ref]);

  if (error) return <ErrorState message={error.message} onRetry={reload} />;
  if (!r) return <Skeleton className="h-96" />;

  const chat = whatsAppTo(r.contactPhone, `Hello ${r.customer.name}, this is about your ${r.service.name.toLowerCase()} request ${r.reference}.`);

  return (
    <>
      <Link href="/admin/requests" className="text-sm underline underline-offset-2">All requests</Link>
      <PageHeader
        title={`${r.service.name} for ${longDate(r.eventDate)}`}
        description={`${r.reference}. Received ${formatDate(r.createdAt)}.`}
        actions={<span className="rounded-sm bg-flour px-2 py-1 text-sm font-semibold text-cocoa">{REQUEST_STATUS_LABEL[r.status]}</span>}
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-8">
          <section aria-labelledby="brief" className="panel p-5">
            <h2 id="brief" className="text-xl">What they asked for</h2>
            <dl className="mt-3 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-3">
              <div><dt className="text-muted">Guests or servings</dt><dd>{r.guestCount ?? '—'}</dd></div>
              <div><dt className="text-muted">Budget</dt><dd>{r.budget ? formatMoney(r.budget) : '—'}</dd></div>
              <div><dt className="text-muted">Getting it there</dt><dd>{FULFILMENT_LABEL[r.fulfilmentPreference]}{r.location ? `: ${r.location}` : ''}</dd></div>
            </dl>
            <p className="mt-4 whitespace-pre-line">{r.notes}</p>
            {r.images.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-3">
                {r.images.map((src, i) => (
                  <li key={i}>
                    <a href={src} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt={`Reference photo ${i + 1}`} className="size-32 rounded-sm border border-flour object-cover" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
            {r.imageCount > 0 && r.images.length === 0 && <p className="mt-3 text-sm text-muted">{r.imageCount} photo(s) attached but couldn’t be loaded. Check storage settings.</p>}
          </section>

          {r.staffActions.quote ? <QuoteForm r={r} onSaved={reload} /> : r.quote && <QuoteSummary r={r} />}

          <StatusActions r={r} onSaved={reload} />
        </div>

        <aside className="space-y-6">
          <section aria-labelledby="cust" className="panel p-5 text-sm">
            <h2 id="cust" className="text-xl">Customer</h2>
            <p className="mt-2 font-semibold">{r.customer.name}</p>
            <p><a href={`mailto:${r.customer.email}`} className="underline">{r.customer.email}</a></p>
            <p><a href={`tel:${r.contactPhone}`} className="underline">{r.contactPhone}</a></p>
            {chat && (
              <a className="btn btn-secondary mt-3 w-full" target="_blank" rel="noopener noreferrer"
                href={chat}>
                Message on WhatsApp
              </a>
            )}
          </section>

          {r.orders.length > 0 && (
            <section aria-labelledby="dep" className="panel p-5 text-sm">
              <h2 id="dep" className="text-xl">Deposit payments</h2>
              <ul className="mt-2 space-y-2">
                {r.orders.map((o) => (
                  <li key={o.orderNumber}>
                    <Link href={`/admin/orders/${o.orderNumber}`} className="underline">{o.orderNumber}</Link> {formatMoney(o.total)}{' '}
                    <StatusBadge status={o.status} />
                    {o.needsReconciliation && <span className="block text-xs font-semibold text-danger">Needs payment check</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <StaffNotes r={r} />
        </aside>
      </div>
    </>
  );
}

function QuoteSummary({ r }: { r: StaffRequestView }) {
  const q = r.quote!;
  return (
    <section aria-labelledby="q" className="panel p-5 text-sm">
      <h2 id="q" className="text-xl">Quote</h2>
      <dl className="mt-3 max-w-sm space-y-1">
        <div className="flex justify-between"><dt>Total</dt><dd className="font-semibold">{formatMoney(q.amount)}</dd></div>
        <div className="flex justify-between"><dt>Deposit</dt><dd>{formatMoney(q.deposit)}{r.depositPaidAt ? ' (paid)' : ''}</dd></div>
        <div className="flex justify-between"><dt>Balance due</dt><dd>{formatMoney(q.balance)}</dd></div>
      </dl>
      {q.note && <p className="mt-3 whitespace-pre-line">{q.note}</p>}
      {r.status === 'ACCEPTED' && <p className="mt-3 text-muted">Accepted {r.acceptedAt ? formatDate(r.acceptedAt) : ''}. Waiting for the deposit.</p>}
    </section>
  );
}

function QuoteForm({ r, onSaved }: { r: StaffRequestView; onSaved: () => void }) {
  const saver = useSaver();
  const [amount, setAmount] = useState(r.quote?.amount ?? r.budget ?? '');
  const [deposit, setDeposit] = useState(r.quote?.deposit ?? '');
  const [validUntil, setValidUntil] = useState(r.quote?.validUntil && !r.quote.expired ? r.quote.validUntil : plusDays(7));
  const [note, setNote] = useState(r.quote?.note ?? '');
  const fe = saver.fields ?? {};
  const amountOk = MONEY_RE.test(amount) && Number(amount) > 0;
  const depositOk = MONEY_RE.test(deposit) && Number(deposit) <= Number(amount || 0);
  const halfDeposit = amountOk ? (Math.round(Number(amount) * 50) / 100).toFixed(2) : null;

  return (
    <section aria-labelledby="qf" className="panel p-5">
      <h2 id="qf" className="text-xl">{r.quote ? 'Send a new quote' : 'Send a quote'}</h2>
      {r.status === 'DECLINED' && <p className="mt-1 text-sm text-danger">The customer declined the last quote{r.closedReason ? `: “${r.closedReason}”` : ''}.</p>}
      <div className="mt-4 grid gap-5 sm:grid-cols-3">
        <Field id="amount" label="Total price (GHS)" hint="Everything the customer pays, including any tax and delivery." error={fe.quoteAmount}>
          <input id="amount" className="field" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.trim())} aria-invalid={!!amount && !amountOk} />
        </Field>
        <Field id="deposit" label="Deposit to book (GHS)" hint={halfDeposit ? `Enter 0 for no deposit. Half would be ${formatMoney(halfDeposit)}.` : 'Enter 0 for no deposit.'} error={fe.depositAmount ?? (!!deposit && !depositOk ? 'Must not exceed the total.' : undefined)}>
          <input id="deposit" className="field" inputMode="decimal" value={deposit} onChange={(e) => setDeposit(e.target.value.trim())} />
        </Field>
        <Field id="valid" label="Valid until" error={fe.quoteValidUntil}>
          <input id="valid" type="date" className="field" min={plusDays(0)} max={r.eventDate} value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
        </Field>
        <Field id="note" label="What’s included (the customer sees this)" className="sm:col-span-3">
          <textarea id="note" className="field min-h-28" maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. 3-tier vanilla and red velvet, gold drip, fresh flowers. Delivered and set up at the venue. Balance due on delivery." />
        </Field>
      </div>
      <div className="mt-4 flex items-center gap-4">
        <button type="button" className="btn btn-primary" disabled={!amountOk || !depositOk || !validUntil || saver.saving}
          onClick={async () => { if (await saver.run(() => requestsApi.quote(r.reference, { quoteAmount: amount, depositAmount: deposit, quoteValidUntil: validUntil, quoteNote: note || undefined }), 'Quote sent to the customer')) onSaved(); }}>
          Send quote
        </button>
        <SaveStatus status={saver.status} message={saver.message} />
      </div>
    </section>
  );
}

function StatusActions({ r, onSaved }: { r: StaffRequestView; onSaved: () => void }) {
  const saver = useSaver();
  const [pending, setPending] = useState<'REJECTED' | 'CANCELLED' | null>(null);
  const [reason, setReason] = useState('');
  const { reject, complete, cancel } = r.staffActions;
  if (!reject && !complete && !cancel) return r.closedReason ? <p className="text-sm text-muted">Closed: {r.closedReason}</p> : null;

  const run = async (status: 'REJECTED' | 'COMPLETED' | 'CANCELLED') => {
    const res = await saver.run(() => requestsApi.setStatus(r.reference, status, reason || undefined), status === 'COMPLETED' ? 'Marked completed' : 'Customer has been told');
    if (res) { setPending(null); setReason(''); onSaved(); }
  };

  return (
    <section aria-labelledby="act" className="panel p-5">
      <h2 id="act" className="text-xl">Other actions</h2>
      <div className="mt-3 flex flex-wrap gap-3">
        {complete && <button type="button" className="btn btn-primary" disabled={saver.saving} onClick={() => run('COMPLETED')}>Mark completed</button>}
        {reject && <button type="button" className="btn btn-secondary" onClick={() => setPending('REJECTED')}>We can’t do this</button>}
        {cancel && <button type="button" className="btn btn-secondary" onClick={() => setPending('CANCELLED')}>Cancel request</button>}
      </div>
      {pending && (
        <div className="mt-4 max-w-md">
          <label htmlFor="sreason" className="label">Reason (the customer sees this)</label>
          <textarea id="sreason" className="field min-h-20" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500}
            placeholder={pending === 'REJECTED' ? 'e.g. We’re fully booked that weekend.' : 'e.g. Cancelled at the customer’s request.'} />
          {pending === 'CANCELLED' && r.status === 'CONFIRMED' && (
            <p className="mt-2 text-sm text-danger">The deposit was paid. Refund it through Hubtel according to your cancellation policy.</p>
          )}
          <div className="mt-3 flex gap-3">
            <button type="button" className="btn btn-primary" disabled={!reason.trim() || saver.saving} onClick={() => run(pending)}>
              {pending === 'REJECTED' ? 'Decline request' : 'Cancel request'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setPending(null)}>Back</button>
          </div>
        </div>
      )}
      <p className="mt-2"><SaveStatus status={saver.status} message={saver.message} /></p>
    </section>
  );
}

function StaffNotes({ r }: { r: StaffRequestView }) {
  const saver = useSaver();
  const [notes, setNotes] = useState(r.staffNotes ?? '');
  return (
    <section aria-labelledby="sn" className="panel p-5 text-sm">
      <h2 id="sn" className="text-xl">Staff notes</h2>
      <p className="text-xs text-muted">Only staff see these.</p>
      <label htmlFor="staffnotes" className="sr-only">Staff notes</label>
      <textarea id="staffnotes" className="field mt-2 min-h-28" maxLength={4000} value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div className="mt-2 flex items-center gap-3">
        <button type="button" className="btn btn-secondary" disabled={notes === (r.staffNotes ?? '') || saver.saving} onClick={() => saver.run(() => requestsApi.saveNotes(r.reference, notes))}>Save notes</button>
        <SaveStatus status={saver.status} message={saver.message} />
      </div>
    </section>
  );
}
