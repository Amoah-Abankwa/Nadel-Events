'use client';

import { useState } from 'react';
import { authApi } from '@/lib/api/auth';

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-4xl">Reset your password</h1>
      {sent ? (
        <p role="status" className="mt-6">If an account exists for that email, we’ve sent a reset link. It expires in 1 hour.</p>
      ) : (
        <form
          className="mt-6 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setPending(true);
            await authApi.forgotPassword(String(new FormData(e.currentTarget).get('email'))).catch(() => undefined);
            setSent(true);
          }}
        >
          <div>
            <label htmlFor="email" className="label">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required className="field" />
          </div>
          <button type="submit" className="btn btn-primary w-full" disabled={pending}>Send reset link</button>
        </form>
      )}
    </div>
  );
}
