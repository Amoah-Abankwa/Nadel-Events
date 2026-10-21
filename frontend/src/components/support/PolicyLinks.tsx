import Link from 'next/link';
import { POLICY_LINKS } from '@/lib/site-links';

/**
 * The store's policy links, rendered the same way in every section's footer and the checkout.
 * Each policy page exists once (in the main shop), so there is one version of every policy.
 */
export function PolicyLinks({ className = '', linkClassName = 'hover:underline', separator = ' · ' }: { className?: string; linkClassName?: string; separator?: string }) {
  return (
    <nav aria-label="Policies" className={className}>
      {POLICY_LINKS.map((l, i) => (
        <span key={l.href}>
          {i > 0 && <span aria-hidden>{separator}</span>}
          <Link href={l.href} className={linkClassName}>{l.label}</Link>
        </span>
      ))}
    </nav>
  );
}
