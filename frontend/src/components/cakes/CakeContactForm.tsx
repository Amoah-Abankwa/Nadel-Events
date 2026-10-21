'use client';

import { CONTACT_TOPICS as TOPICS, useContactForm } from '@/hooks/use-forms';

/** Name / Email / Phone in a row, topic, message, centred Send. Goes to Admin → Messages. */
export function CakeContactForm() {
  const { f, bind, name, state, error, fieldErrors: fe, submit } = useContactForm('CUSTOM_CAKE');
  const input = 'h-11 w-full border border-flour bg-paper px-4 text-[15px] placeholder:text-muted focus-visible:outline-rose';

  if (state === 'sent') return <p role="status" className="border border-flour p-6 text-center">Thank you, {name.split(' ')[0]}! We’ll get back to you by email, usually within a working day.</p>;

  return (
    <form noValidate className="space-y-5" onSubmit={submit}>
      <div className="grid gap-5 sm:grid-cols-3">
        <div>
          <label htmlFor="cc-name" className="sr-only">Name</label>
          <input id="cc-name" className={input} placeholder="Name" autoComplete="name" {...bind('name')} aria-invalid={!!fe.name} required />
          {fe.name && <p className="mt-1 text-xs text-danger">{fe.name}</p>}
        </div>
        <div>
          <label htmlFor="cc-email" className="sr-only">Email</label>
          <input id="cc-email" type="email" className={input} placeholder="Email" autoComplete="email" {...bind('email')} aria-invalid={!!fe.email} required />
          {fe.email && <p className="mt-1 text-xs text-danger">{fe.email}</p>}
        </div>
        <div>
          <label htmlFor="cc-phone" className="sr-only">Phone (optional)</label>
          <input id="cc-phone" type="tel" inputMode="tel" className={input} placeholder="Phone (optional)" autoComplete="tel" {...bind('phone')} aria-invalid={!!fe.phone} />
          {fe.phone && <p className="mt-1 text-xs text-danger">{fe.phone}</p>}
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        <div className={f.topic === 'ORDER' ? '' : 'sm:col-span-3'}>
          <label htmlFor="cc-topic" className="sr-only">About</label>
          <select id="cc-topic" className={input} {...bind('topic')}>
            {TOPICS.map(([v, l]) => <option key={v} value={v}>About: {l}</option>)}
          </select>
        </div>
        {f.topic === 'ORDER' && (
          <div className="sm:col-span-2">
            <label htmlFor="cc-order" className="sr-only">Order number</label>
            <input id="cc-order" className={input} placeholder="Order number, e.g. CK-261017-ABC123" {...bind('orderNumber')} />
          </div>
        )}
      </div>
      <div>
        <label htmlFor="cc-msg" className="sr-only">Message</label>
        <textarea id="cc-msg" className="min-h-52 w-full border border-flour bg-paper p-4 text-[15px] placeholder:text-muted focus-visible:outline-rose" placeholder="Message" maxLength={3000} {...bind('message')} aria-invalid={!!fe.message} required />
        {fe.message && <p className="mt-1 text-xs text-danger">{fe.message}</p>}
      </div>
      <div aria-hidden className="absolute -left-[9999px] h-0 overflow-hidden"><label htmlFor="cc-web">Leave empty</label><input id="cc-web" tabIndex={-1} autoComplete="off" {...bind('website')} /></div>
      {error && !Object.keys(fe).length && <p role="alert" className="text-center text-sm text-danger">{error.message}</p>}
      <div className="flex justify-center">
        <button type="submit" disabled={state === 'sending'} className="btn w-full max-w-xs bg-rose text-paper hover:bg-rose-deep">{state === 'sending' ? 'Sending…' : 'Send'}</button>
      </div>
    </form>
  );
}