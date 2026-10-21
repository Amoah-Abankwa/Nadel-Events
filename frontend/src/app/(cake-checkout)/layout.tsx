import Link from 'next/link';
import { IconBag } from '@/components/icons/Icons';
import { siteConfig } from '@/lib/config';
import { PolicyLinks } from '@/components/support/PolicyLinks';

/** Distraction-free checkout for the cake section: store name and a cart link only. */
export default function CakeCheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-paper">
      <header className="border-b border-flour">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/cakes" className="text-2xl font-semibold text-charcoal">{siteConfig.storeName}</Link>
          <Link href="/cakes/cart" aria-label="Back to your cart" className="text-rose hover:text-rose-deep"><IconBag className="size-7" /></Link>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-6xl px-6 py-10">{children}</main>
      <footer className="mx-auto max-w-6xl border-t border-flour px-6 py-6 text-xs text-muted">
        © {new Date().getFullYear()} {siteConfig.storeName}. Payments are processed securely by our payment provider.
        <PolicyLinks className="mt-1" linkClassName="underline" />
      </footer>
    </div>
  );
}
