import { Suspense } from 'react';
import { ResetForm } from './ResetForm';

export const metadata = { title: 'Set a new password', robots: { index: false } };

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-4xl">Set a new password</h1>
      <Suspense fallback={null}><ResetForm /></Suspense>
    </div>
  );
}
