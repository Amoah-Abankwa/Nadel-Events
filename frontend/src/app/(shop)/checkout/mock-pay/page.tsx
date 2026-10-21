import { Suspense } from 'react';
import { MockPay } from './MockPay';

export const metadata = { title: 'Test payment', robots: { index: false } };

export default function MockPayPage() {
  return (
    <Suspense fallback={null}>
      <MockPay />
    </Suspense>
  );
}
