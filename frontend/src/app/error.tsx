'use client';

import { ErrorState } from '@/components/support/ErrorState';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <h1 className="mb-4 text-3xl">This page didn’t load</h1>
      <ErrorState message="The shop couldn’t load this page. Check your connection and try again." onRetry={reset} />
    </div>
  );
}
