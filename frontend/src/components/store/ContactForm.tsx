'use client';

import { CONTACT_TOPICS as TOPICS, useContactForm } from '@/hooks/use-forms';

/** Enquiry form (name, email, enquiry) with topic, optional order number and a hidden bot trap. */
export function ContactForm() {
  const { f, bind, name, state, error, fieldErrors: fe, submit } = useContactForm('ORDER');

  if (state === 'sent') {
    return <p role="status" className="bg-paper p-6 shadow-[0_1px_6px_var(--color-panel-shadow)]">Thanks, {name.split(' ')[0]}. We’ve got your message and will reply by email, usually within a working day.</p>;
  }

  const row = 'grid gap-2 sm:grid-cols-[10rem_1fr] sm:items-start sm:gap-6';
  const lab = 'pt-2.5 text-sm sm:text-right';
  const req = <span aria-hidden className="text-danger">* </span>;

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={submit}
    >
      <div className={row}>
        <label htmlFor="c-name" className={lab}>{req}Your name</label>
        <div><input id="c-name" className="field" autoComplete="name" {...bind('name')} aria-invalid={!!fe.name} required />{fe.name && <p className="mt-1 text-xs text-danger">{fe.name}</p>}</div>
      </div>
      <div className={row}>
        <label htmlFor="c-email" className={lab}>{req}Email address</label>
        <div><input id="c-email" type="email" className="field" autoComplete="email" {...bind('email')} aria-invalid={!!fe.email} required />{fe.email && <p className="mt-1 text-xs text-danger">{fe.email}</p>}</div>
      </div>
      <div className={row}>
        <label htmlFor="c-phone" className={lab}>Phone (optional)</label>
        <div><input id="c-phone" type="tel" inputMode="tel" className="field" autoComplete="tel" {...bind('phone')} aria-invalid={!!fe.phone} />{fe.phone && <p className="mt-1 text-xs text-danger">{fe.phone}</p>}</div>
      </div>
      <div className={row}>
        <label htmlFor="c-topic" className={lab}>{req}About</label>
        <select id="c-topic" className="field" {...bind('topic')}>
          {TOPICS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      {f.topic === 'ORDER' && (
        <div className={row}>
          <label htmlFor="c-order" className={lab}>Order number</label>
          <input id="c-order" className="field" placeholder="e.g. CK-261017-ABC123" {...bind('orderNumber')} />
        </div>
      )}
      <div className={row}>
        <label htmlFor="c-msg" className={lab}>{req}Enquiry</label>
        <div><textarea id="c-msg" className="field min-h-48" maxLength={3000} {...bind('message')} aria-invalid={!!fe.message} required />{fe.message && <p className="mt-1 text-xs text-danger">{fe.message}</p>}</div>
      </div>
      <div aria-hidden className="absolute -left-[9999px] h-0 overflow-hidden">
        <label htmlFor="c-website">Leave this empty</label>
        <input id="c-website" tabIndex={-1} autoComplete="off" {...bind('website')} />
      </div>
      {error && !Object.keys(fe).length && <p role="alert" className="text-sm text-danger sm:text-right">{error.message}</p>}
      <div className="flex justify-end">
        <button type="submit" className="btn btn-primary" disabled={state === 'sending'}>{state === 'sending' ? 'Sending…' : 'Submit'}</button>
      </div>
    </form>
  );
}
