'use client';

import Link from 'next/link';
import { siteConfig } from '@/lib/config';

/** Records a click without delaying navigation (sendBeacon survives the page change). */
export function BannerLink({ id, href, children, className }: { id: string; href: string; children: React.ReactNode; className?: string }) {
  const track = () => {
    try {
      navigator.sendBeacon?.(`${siteConfig.apiUrl}/banners/${id}/click`);
    } catch {
      /* tracking must never break the link */
    }
  };
  return href.startsWith('/') ? (
    <Link href={href} onClick={track} className={className}>{children}</Link>
  ) : (
    <a href={href} onClick={track} className={className} rel="noopener sponsored">{children}</a>
  );
}
