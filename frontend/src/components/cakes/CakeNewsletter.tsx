'use client';

import Link from 'next/link';
import { useNewsletter } from '@/hooks/use-forms';
import { StarPattern } from './Shapes';

/** Newsletter band with a zig-zag top edge and a consent checkbox. */
export function CakeNewsletter() {
  const nl = useNewsletter('other');
  const { email, setEmail, consent, setConsent, state, error } = nl;
  return (
    <section aria-labelledby="cake-nl-h" className="relative overflow-hidden bg-flour">
      <svg aria-hidden className="block h-3 w-full" preserveAspectRatio="none">
        <defs><pattern id="zig" width="16" height="12" patternUnits="userSpaceOnUse"><path d="M0 0L8 12L16 0Z" fill="var(--color-paper)" /></pattern></defs>
        <rect width="100%" height="100%" fill="url(#zig)" />
      </svg>
      <StarPattern color="rgb(74 46 36 / 0.07)" />
      <div className="relative mx-auto max-w-2xl px-6 py-20 text-center">
        <h2 id="cake-nl-h" className="font-script text-6xl font-normal text-charcoal" style={{ color: 'inherit' }}>Newsletter</h2>
        <p className="mt-4 text-[15px] text-charcoal/85">New cakes, seasonal flavours and the occasional sweet offer. A few emails a month at most.</p>
        {state === 'done' ? (
          <p role="status" className="mt-8 text-lg">Thank you! Check your inbox for a welcome email.</p>
        ) : (
          <form className="mt-8" onSubmit={nl.submit}>
            <div className="mx-auto flex max-w-lg">
              <label htmlFor="cake-nl" className="sr-only">Email address</label>
              <input id="cake-nl" type="email" autoComplete="email" required placeholder="Your email address" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 min-w-0 flex-1 bg-charcoal px-5 text-paper placeholder:text-paper/60" />
              <button type="submit" disabled={!email || !consent || state === 'sending'} className="h-12 bg-[#7DCBE0] px-6 font-semibold text-charcoal hover:bg-[#62bcd4] disabled:opacity-60">Subscribe</button>
            </div>
            <label className="mx-auto mt-3 flex max-w-lg justify-center gap-2 text-left text-xs text-charcoal/80">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-rose" />
              <span>I agree to receive marketing emails. Unsubscribe any time. <Link href="/privacy" className="underline">Privacy policy</Link>.</span>
            </label>
            {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
          </form>
        )}
      </div>
    </section>
  );
}
