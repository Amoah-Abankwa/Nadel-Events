import type { Metadata } from 'next';
import { CakeCartView } from '@/components/cakes/CakeCartView';
import { PageBanner } from '@/components/cakes/PageBanner';

export const metadata: Metadata = { title: 'Your shopping cart', robots: { index: false } };

export default function CakeCartPage() {
  return (
    <>
      <PageBanner title="Your shopping cart" crumbs={[{ label: 'Your shopping cart' }]} />
      <div className="mx-auto max-w-6xl px-6 py-16"><CakeCartView /></div>
    </>
  );
}
