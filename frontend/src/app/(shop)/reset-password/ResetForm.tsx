'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { ErrorState } from '@/components/support/ErrorState';
import { authApi } from '@/lib/api/auth';
import type { ApiError } from '@/lib/api/errors';

export function ResetForm() {
  const token = useSearchParams().get('token') ?? '';
  const [done, setDone] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  if (done) {
    return (
      <p role="status" className="mt-6">
        Your password is updated. <Link href="/login" className="font-semibold underline">Sign in</Link>
      </p>
    );
  }
  return (
    <form
      className="mt-6 space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        try {
          await authApi.resetPassword(token, String(new FormData(e.currentTarget).get('password')));
          setDone(true);
        } catch (err) {
          setError(err as ApiError);
        }
      }}
    >
      <div>
        <label htmlFor="password" className="label">New password</label>
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required className="field" aria-describedby="pw-hint" />
        <p id="pw-hint" className="mt-1 text-sm text-muted">At least 10 characters.</p>
      </div>
      {error && <ErrorState message={error.message} />}
      <button type="submit" className="btn btn-primary w-full">Set new password</button>
    </form>
  );
}
