import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { WhatsAppButton } from '@/components/support/WhatsAppButton';
import { BackToTop } from '@/components/support/BackToTop';
import { serverGet } from '@/lib/api/server';
import type { Category } from '@/lib/types';

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  // Navigation must not take the whole site down if the API is briefly unavailable.
  const categories = await serverGet<Category[]>('/categories', 300).catch(() => [] as Category[]);

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-paper focus:px-4 focus:py-2">
        Skip to content
      </a>
      <Header categories={categories} />
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">{children}</main>
      <Footer />
      <WhatsAppButton />
      <BackToTop />
    </div>
  );
}
