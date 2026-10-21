import type { Metadata } from 'next';
import { CheckoutView } from '@/components/checkout/CheckoutView';

export const metadata: Metadata = { title: 'Checkout', robots: { index: false } };

/**
 * Same checkout as the main shop (sign-in, server-priced quote, verified payment),
 * restyled for the cake section: rose buttons and a soft grey order summary.
 */
export default function CakeCheckoutPage() {
  return (
    <div className="[&_.btn-primary:hover:not(:disabled)]:bg-rose-deep [&_.btn-primary]:bg-rose [&_aside.panel]:border-0 [&_aside.panel]:bg-cream [&_h2]:font-sans [&_h2]:font-semibold [&_h2]:text-charcoal [&_input]:accent-rose">
      <h1 className="sr-only">Checkout</h1>
      <CheckoutView />
    </div>
  );
}
