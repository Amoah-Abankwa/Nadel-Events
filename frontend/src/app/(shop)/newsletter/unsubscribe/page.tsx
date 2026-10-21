'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { api } from '@/lib/api/client';

/** One click from the email, then one confirming click here (so link-scanning tools can't unsubscribe people). */
function Unsubscribe() {
  const token = useSearchParams().get('token') ?? '';
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  return (
    <div className="mx-auto max-w-md bg-paper p-8 text-center shadow-[0_1px_6px_var(--color-panel-shadow)]">
      <h1 className="text-3xl">{state === 'done' ? 'You’re unsubscribed' : 'Unsubscribe'}</h1>
      {state === 'done' ? (
        <p className="mt-3 text-muted">You won’t get marketing emails from us any more. Order emails still arrive as normal.</p>
      ) : (
        <>
          <p className="mt-3 text-muted">Stop receiving our newsletter and offers?</p>
          <button type="button" className="btn btn-primary mt-6" disabled={!token || state === 'busy'}
            onClick={async () => { setState('busy'); try { await api.post('/newsletter/unsubscribe', { token }); setState('done'); } catch { setState('error'); } }}>
            Unsubscribe
          </button>
          {state === 'error' && <p role="alert" className="mt-3 text-sm text-danger">That link didn’t work. Try the link in your latest email.</p>}
        </>
      )}
      <p className="mt-6"><Link href="/" className="text-sm underline">Back to the shop</Link></p>
    </div>
  );
}

export default function UnsubscribePage() {
  return <Suspense fallback={null}><Unsubscribe /></Suspense>;
}
