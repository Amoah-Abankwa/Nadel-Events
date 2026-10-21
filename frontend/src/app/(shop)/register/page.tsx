'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Breadcrumbs } from '@/components/store/Breadcrumbs';
import { authApi } from '@/lib/api/auth';
import type { ApiError } from '@/lib/api/errors';
import { safeNext } from '@/lib/format';
import { useSession } from '@/stores/session-store';

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next'), '/account/orders');
  const setUser = useSession((s) => s.setUser);
  const [error, setError] = useState<ApiError | null>(null);
  const [pending, setPending] = useState(false);
  const fe = error?.fieldErrors?.() ?? {};

  const field = (id: string, label: string, props: React.InputHTMLAttributes<HTMLInputElement>, hint?: string) => (
    <div className="grid gap-1 sm:grid-cols-[10rem_1fr] sm:items-start sm:gap-6">
      <label htmlFor={id} className="pt-2.5 text-sm sm:text-right">{props.required && <span aria-hidden className="text-danger">* </span>}{label}</label>
      <div>
        <input id={id} name={id} className="field" aria-invalid={!!fe[id]} aria-describedby={hint ? `${id}-hint` : undefined} {...props} />
        {fe[id] ? <p className="mt-1 text-xs text-danger">{fe[id]}</p> : hint && <p id={`${id}-hint`} className="mt-1 text-xs text-muted">{hint}</p>}
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl">
      <Breadcrumbs items={[{ label: 'Account', href: '/account/orders' }, { label: 'Register' }]} />
      <h1 className="font-sans text-3xl font-normal text-charcoal">Register account</h1>
      <p className="mt-2 text-[15px]">Already have an account? <Link href={`/login${params.get('next') ? `?next=${encodeURIComponent(next)}` : ''}`} className="text-burgundy underline">Log in here</Link>.</p>
      <form
        noValidate
        className="mt-6 space-y-4 bg-paper p-6 shadow-[0_1px_6px_var(--color-panel-shadow)] sm:p-8"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          setPending(true);
          const f = new FormData(e.currentTarget);
          try {
            const user = await authApi.register({ name: String(f.get('name')), email: String(f.get('email')), phone: String(f.get('phone') || '') || undefined, password: String(f.get('password')) });
            setUser(user);
            router.replace(next);
          } catch (err) {
            setError(err as ApiError);
            setPending(false);
          }
        }}
      >
        <h2 className="border-b border-flour pb-2 font-sans text-lg font-semibold">Your personal details</h2>
        {field('name', 'Full name', { autoComplete: 'name', required: true })}
        {field('email', 'Email address', { type: 'email', autoComplete: 'email', required: true })}
        {field('phone', 'Phone', { type: 'tel', inputMode: 'tel', autoComplete: 'tel' }, 'For delivery updates.')}
        <h2 className="border-b border-flour pb-2 pt-2 font-sans text-lg font-semibold">Your password</h2>
        {field('password', 'Password', { type: 'password', autoComplete: 'new-password', minLength: 10, required: true }, 'At least 10 characters.')}
        {error && !Object.keys(fe).length && <p role="alert" className="text-sm text-danger">{error.message}</p>}
        <div className="flex flex-wrap items-center justify-end gap-4 pt-2">
          <p className="text-sm text-muted">By registering you agree to our <Link href="/terms" className="underline">terms</Link> and <Link href="/privacy" className="underline">privacy policy</Link>.</p>
          <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? 'Creating account…' : 'Continue'}</button>
        </div>
      </form>
    </div>
  );
}

export default function RegisterPage() {
  return <Suspense fallback={null}><RegisterForm /></Suspense>;
}
