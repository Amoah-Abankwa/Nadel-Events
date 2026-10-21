import { Cormorant_Garamond, Great_Vibes, Oswald } from 'next/font/google';
import { DecorFooter } from '@/components/decor/DecorFooter';
import { DecorHeader } from '@/components/decor/DecorHeader';
import { BackToTop } from '@/components/support/BackToTop';
import { WhatsAppButton } from '@/components/support/WhatsAppButton';
import { serverGet } from '@/lib/api/server';
import type { Category } from '@/lib/types';
import { findDepartment } from '@/lib/departments';

const elegant = Cormorant_Garamond({ subsets: ['latin'], weight: ['400', '500'], style: ['normal', 'italic'], variable: '--font-cormorant', display: 'swap' });
const condensed = Oswald({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-oswald', display: 'swap' });
const signature = Great_Vibes({ subsets: ['latin'], weight: '400', variable: '--font-great-vibes', display: 'swap' });

/** The decoration studio has its own calm, elegant chrome. Product, cart and checkout pages stay in the main shop. */
export default async function DecorLayout({ children }: { children: React.ReactNode }) {
  const categories = await serverGet<Category[]>('/categories', 300).catch(() => [] as Category[]);
  const decor = findDepartment(categories, 'decor');
  return (
    <div className={`${elegant.variable} ${condensed.variable} ${signature.variable} min-h-dvh bg-paper`}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-paper focus:px-4 focus:py-2">Skip to content</a>
      <DecorHeader decorSlug={decor?.slug ?? null} />
      <main id="main">{children}</main>
      <DecorFooter />
      <WhatsAppButton message="Hello, I’d like to ask about decoration for an event." />
      <BackToTop />
    </div>
  );
}
