import { Caveat } from 'next/font/google';
import { CakeFooter } from '@/components/cakes/CakeFooter';
import { CakeHeader } from '@/components/cakes/CakeHeader';
import { BackToTop } from '@/components/support/BackToTop';
import { WhatsAppButton } from '@/components/support/WhatsAppButton';
import { serverGet } from '@/lib/api/server';
import type { Category } from '@/lib/types';
import { findDepartment } from '@/lib/departments';

const script = Caveat({ subsets: ['latin'], weight: ['500', '700'], variable: '--font-caveat', display: 'swap' });

/** The cake section has its own playful chrome; checkout, account and product pages stay in the main shop. */
export default async function CakesLayout({ children }: { children: React.ReactNode }) {
  const categories = await serverGet<Category[]>('/categories', 300).catch(() => [] as Category[]);
  const cake = findDepartment(categories, 'cakes');
  return (
    <div className={`${script.variable} relative min-h-dvh bg-paper`}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-paper focus:px-4 focus:py-2">Skip to content</a>
      <CakeHeader cake={cake ?? null} />
      <main id="main">{children}</main>
      <CakeFooter />
      <WhatsAppButton message="Hello, I’d like to ask about a cake." />
      <BackToTop />
    </div>
  );
}
