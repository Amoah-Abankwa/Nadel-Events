'use client';

import Link from 'next/link';
import { useNewsletter } from '@/hooks/use-forms';

/** Newsletter signup with explicit consent (unticked by default) and a privacy link. */
export function NewsletterBox({ source = 'home.sidebar' }: { source?: 'home.sidebar' | 'footer' }) {
  const nl = useNewsletter(source);
  const { email, setEmail, consent, setConsent, state, error } = nl;

  return (
    <section aria-labelledby="newsletter-h" className="bg-paper p-5 shadow-[0_1px_6px_var(--color-panel-shadow)]">
      <h2 id="newsletter-h" className="border-b border-flour pb-4 font-sans text-lg font-bold uppercase tracking-wide text-charcoal">Newsletter</h2>
      {state === 'done' ? (
        <p role="status" className="mt-4">Thanks. Check your inbox for a welcome email.</p>
      ) : (
        <form
          className="mt-4 space-y-3"
          onSubmit={nl.submit}
        >
          <p className="text-[15px]">New cakes, kitchen finds and offers. Not too often.</p>
          <label htmlFor="nl-email" className="sr-only">Email address</label>
          <input id="nl-email" type="email" autoComplete="email" required placeholder="Your email address" value={email} onChange={(e) => setEmail(e.target.value)} className="field bg-cream text-sm" />
          <label className="flex gap-2 text-xs text-muted">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-burgundy" />
            <span>I agree to receive marketing emails. Unsubscribe any time. See our <Link href="/privacy" className="underline">privacy policy</Link>.</span>
          </label>
          {error && <p role="alert" className="text-xs text-danger">{error}</p>}
          <button type="submit" className="btn btn-primary h-10 min-h-0 uppercase" disabled={!email || !consent || state === 'sending'}>
            {state === 'sending' ? 'Signing up…' : 'Subscribe'}
          </button>
        </form>
      )}
    </section>
  );
}
