import type { Metadata } from 'next';
import { CartView } from '@/components/cart/CartView';
import { StoreColumns } from '@/components/store/StoreColumns';

export const metadata: Metadata = { title: 'Shopping cart', robots: { index: false } };

export default function CartPage() {
  return (
    <StoreColumns crumbs={[{ label: 'Shopping cart' }]}>
      <CartView />
    </StoreColumns>
  );
}
