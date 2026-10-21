import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { WhatsAppButton } from '@/components/support/WhatsAppButton';
import { BackToTop } from '@/components/support/BackToTop';
import { serverGet } from '@/lib/api/server';
import type { Category } from '@/lib/types';

export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Navigation must not take the whole site down if the API is briefly unavailable.
  const categories = await serverGet<Category[]>('/categories', 300).catch(
    () => [] as Category[],
  );

  return (
    <div className="flex min-h-dvh w-full flex-col overflow-x-clip">
      {/* Accessible skip link */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-md focus:bg-paper focus:px-4 focus:py-3 focus:text-sm focus:font-medium focus:shadow-lg"
      >
        Skip to content
      </a>

      {/* Header should handle its own mobile navigation */}
      <Header categories={categories} />

      {/* Responsive page content */}
      <main
        id="main"
        className="
          mx-auto
          w-full
          min-w-0
          max-w-6xl
          flex-1
          px-3
          py-4
          sm:px-5
          sm:py-6
          md:px-6
          md:py-8
          lg:px-8
        "
      >
        {children}
      </main>

      <Footer />

      {/* Floating support and navigation controls */}
      <WhatsAppButton />
      <BackToTop />
    </div>
  );
}