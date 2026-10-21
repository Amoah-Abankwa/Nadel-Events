import type { Metadata } from 'next';
import { Suspense } from 'react';
import { RequestForm } from '@/components/requests/RequestForm';

export const metadata: Metadata = { title: 'Request a quote', robots: { index: false } };

export default function RequestPage() {
  return (
    <>
      <h1 className="mb-2 text-4xl">Request a quote</h1>
      <p className="mb-8 max-w-xl text-muted">The more you tell us, the more accurate the quote. There’s no charge until you accept it.</p>
      <Suspense fallback={null}><RequestForm /></Suspense>
    </>
  );
}
