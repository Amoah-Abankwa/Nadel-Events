import type { Metadata } from 'next';
import { CheckoutView } from '@/components/checkout/CheckoutView';

export const metadata: Metadata = { title: 'Checkout', robots: { index: false } };

export default function CheckoutPage() {
  return (
    <>
      <h1 className="mb-8 text-4xl">Checkout</h1>
      <CheckoutView />
    </>
  );
}
