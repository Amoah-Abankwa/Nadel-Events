import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ResultView } from './ResultView';

export const metadata: Metadata = { title: 'Order status', robots: { index: false } };

export default function ResultPage() {
  return (
    <Suspense fallback={null}>
      <ResultView />
    </Suspense>
  );
}
