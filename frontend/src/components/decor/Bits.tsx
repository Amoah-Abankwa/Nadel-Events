import Link from 'next/link';
import { siteConfig } from '@/lib/config';

/** Outlined button with a hard offset shadow, as in the reference. */
export function OutlineButton({ href, children, className = '' }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link href={href} className={`inline-flex min-h-11 items-center justify-center border border-charcoal bg-paper px-8 font-condensed text-sm uppercase tracking-[0.15em] text-charcoal shadow-[3px_3px_0_var(--color-charcoal)] transition hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0_var(--color-charcoal)] ${className}`}>
      {children}
    </Link>
  );
}

/** Script wordmark with a spaced "EST." line underneath. */
export function Wordmark({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const est = process.env.NEXT_PUBLIC_ESTABLISHED;
  return (
    <span className="inline-flex flex-col items-center leading-none">
      <span className={`font-signature text-charcoal ${size === 'lg' ? 'text-6xl' : 'text-4xl'}`}>{siteConfig.storeName}</span>
      <span className={`mt-1 font-condensed uppercase tracking-[0.35em] text-taupe ${size === 'lg' ? 'text-base' : 'text-[11px]'}`}>{est ? `Est. ${est}` : 'Decor studio'}</span>
    </span>
  );
}

export const Kicker = ({ children }: { children: React.ReactNode }) => <p className="font-condensed text-lg uppercase tracking-[0.15em] text-taupe">{children}</p>;

export function Elegant({ as: Tag = 'h2', id, children, className = '' }: { as?: 'h1' | 'h2' | 'h3'; id?: string; children: React.ReactNode; className?: string }) {
  return <Tag id={id} className={`font-elegant font-normal italic leading-[1.05] text-charcoal ${className}`} style={{ color: undefined }}>{children}</Tag>;
}

export function CondensedHeading({ id, children, className = '' }: { id?: string; children: React.ReactNode; className?: string }) {
  return <h2 id={id} className={`font-condensed text-3xl font-normal uppercase leading-snug tracking-[0.12em] text-charcoal ${className}`} style={{ color: undefined }}>{children}</h2>;
}
