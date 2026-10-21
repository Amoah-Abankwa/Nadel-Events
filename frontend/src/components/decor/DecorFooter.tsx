'use client';

import Link from 'next/link';
import { useNewsletter } from '@/hooks/use-forms';
import { siteConfig } from '@/lib/config';
import { Wordmark } from './Bits';
import { PolicyLinks } from '@/components/support/PolicyLinks';

const SOCIAL = [
  { label: 'Instagram', href: process.env.NEXT_PUBLIC_INSTAGRAM_URL },
  { label: 'Facebook', href: process.env.NEXT_PUBLIC_FACEBOOK_URL },
  { label: 'TikTok', href: process.env.NEXT_PUBLIC_TIKTOK_URL },
  { label: 'Pinterest', href: process.env.NEXT_PUBLIC_PINTEREST_URL },
].filter((s): s is { label: string; href: string } => Boolean(s.href));

/** Blush footer: centred wordmark, tagline, newsletter (with consent), social links, legal line. */
export function DecorFooter() {
  const nl = useNewsletter('footer');
  const { email, setEmail, consent, setConsent, state, error } = nl;
  return (
    <footer className="border-t border-petal-deep bg-petal">
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <Wordmark size="lg" />
        <p className="mt-6 text-[15px] text-taupe">Decoration makes every celebration warmer, brighter and more you.</p>
        {state === 'done' ? (
          <p role="status" className="mt-5">Thank you. Check your inbox for a welcome email.</p>
        ) : (
          <form className="mt-4" onSubmit={nl.submit}>
            <div className="flex gap-1.5">
              <label htmlFor="df-email" className="sr-only">Email address</label>
              <input id="df-email" type="email" required autoComplete="email" placeholder="Your email address" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 min-w-0 flex-1 border border-petal-deep bg-paper px-4" />
              <button type="submit" disabled={!email || !consent || state === 'sending'} className="h-12 border border-charcoal bg-paper px-6 font-condensed text-sm uppercase tracking-[0.15em] shadow-[3px_3px_0_var(--color-charcoal)] disabled:opacity-60">Subscribe</button>
            </div>
            <label className="mt-3 flex justify-center gap-2 text-left text-xs text-taupe">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-taupe" />
              <span>I agree to receive marketing emails and can unsubscribe at any time.</span>
            </label>
            {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
          </form>
        )}
        {SOCIAL.length > 0 && (
          <ul aria-label="Follow us" className="mt-10 flex justify-center gap-6 font-condensed text-sm uppercase tracking-widest">
            {SOCIAL.map((s) => <li key={s.label}><a href={s.href} target="_blank" rel="noopener noreferrer" className="hover:text-taupe">{s.label}</a></li>)}
          </ul>
        )}
        <p className="mt-10 text-sm text-taupe">
          © {new Date().getFullYear()} {siteConfig.storeName} / <Link href="/" className="underline underline-offset-2">Main shop</Link> / <Link href="/cakes" className="underline underline-offset-2">Cake shop</Link>
        </p>
        <PolicyLinks className="mt-3 text-sm" linkClassName="font-semibold text-charcoal hover:text-taupe" separator=" / " />
      </div>
    </footer>
  );
}
