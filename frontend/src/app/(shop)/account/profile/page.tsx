'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ErrorState } from '@/components/support/ErrorState';
import { Skeleton } from '@/components/support/Skeleton';
import { accountApi } from '@/lib/api/account';
import type { ApiError } from '@/lib/api/errors';
import { useLoad, useSaver } from '@/hooks/use-load';
import { useSession } from '@/stores/session-store';

const status = (s: { status: string; message?: string }) =>
  s.status === 'idle' ? null : <span aria-live="polite" className={`text-sm ${s.status === 'error' ? 'text-danger' : s.status === 'saved' ? 'text-success' : 'text-muted'}`}>{s.status === 'saving' ? 'Saving…' : s.message}</span>;

export default function ProfilePage() {
  const { data, error, reload } = useLoad(() => accountApi.profile(), []);
  if (error) return <ErrorState message={error.message} onRetry={reload} />;
  if (!data) return <Skeleton className="h-64" />;
  return (
    <div className="max-w-xl space-y-12">
      <h1 className="font-sans text-2xl font-normal text-charcoal">My details</h1>
      <Details name={data.name} phone={data.phone ?? ''} email={data.email} />
      <Password />
      <Privacy />
    </div>
  );
}

function Details({ name: n, phone: p, email }: { name: string; phone: string; email: string }) {
  const saver = useSaver();
  const setUser = useSession((s) => s.setUser);
  const user = useSession((s) => s.user);
  const [name, setName] = useState(n);
  const [phone, setPhone] = useState(p);
  const fe = saver.fields ?? {};
  return (
    <form className="space-y-4" onSubmit={async (e) => {
      e.preventDefault();
      if (await saver.run(() => accountApi.updateProfile({ name, phone: phone || undefined }), 'Details saved') && user) setUser({ ...user, name, phone });
    }}>
      <div>
        <label htmlFor="name" className="label">Full name</label>
        <input id="name" className="field" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={Boolean(fe.name)} />
        {fe.name && <p className="mt-1 text-sm text-danger">{fe.name}</p>}
      </div>
      <div>
        <label htmlFor="phone" className="label">Phone</label>
        <input id="phone" type="tel" className="field" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} aria-invalid={Boolean(fe.phone)} />
        {fe.phone && <p className="mt-1 text-sm text-danger">{fe.phone}</p>}
      </div>
      <p className="text-sm text-muted">Email: {email}. To use a different email, contact us.</p>
      <div className="flex items-center gap-3"><button className="btn btn-primary" disabled={saver.saving}>Save details</button>{status(saver)}</div>
    </form>
  );
}

function Password() {
  const saver = useSaver();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const fe = saver.fields ?? {};
  return (
    <form className="space-y-4" aria-labelledby="pw-h" onSubmit={async (e) => {
      e.preventDefault();
      if (await saver.run(() => accountApi.changePassword(current, next), 'Password changed. You’ve been signed out on other devices.')) { setCurrent(''); setNext(''); }
    }}>
      <h2 id="pw-h" className="text-2xl">Change password</h2>
      <div>
        <label htmlFor="cur" className="label">Current password</label>
        <input id="cur" type="password" autoComplete="current-password" className="field" value={current} onChange={(e) => setCurrent(e.target.value)} aria-invalid={Boolean(fe.currentPassword)} />
        {fe.currentPassword && <p className="mt-1 text-sm text-danger">{fe.currentPassword}</p>}
      </div>
      <div>
        <label htmlFor="new" className="label">New password</label>
        <input id="new" type="password" autoComplete="new-password" minLength={10} className="field" value={next} onChange={(e) => setNext(e.target.value)} aria-describedby="new-hint" />
        <p id="new-hint" className="mt-1 text-xs text-muted">At least 10 characters.</p>
      </div>
      <div className="flex items-center gap-3"><button className="btn btn-secondary" disabled={saver.saving || !current || next.length < 10}>Change password</button>{status(saver)}</div>
    </form>
  );
}

function Privacy() {
  const router = useRouter();
  const setUser = useSession((s) => s.setUser);
  const [exporting, setExporting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  async function download() {
    setExporting(true);
    try {
      const data = await accountApi.exportData();
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-data-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setExporting(false);
    }
  }

  return (
    <section aria-labelledby="priv-h" className="space-y-4 border-t border-flour pt-10">
      <h2 id="priv-h" className="text-2xl">Your data</h2>
      <p className="text-sm text-muted">Download a copy of everything we hold about you: profile, addresses, orders, requests and reviews.</p>
      <button type="button" className="btn btn-secondary" onClick={download} disabled={exporting}>{exporting ? 'Preparing…' : 'Download my data'}</button>

      <h3 className="pt-6 font-sans text-base font-semibold text-charcoal">Delete account</h3>
      <p className="text-sm text-muted">
        This removes your profile, addresses, wishlist, reviews and request photos, and signs you out. Records of past orders are kept without your
        personal details, because the law requires us to keep sales records. You can’t delete your account while an order or booking is in progress.
      </p>
      {!confirming ? (
        <button type="button" className="text-sm font-semibold text-danger underline" onClick={() => setConfirming(true)}>Delete my account</button>
      ) : (
        <div className="max-w-sm space-y-3 rounded-md border border-danger/40 p-4">
          <label htmlFor="delpw" className="label">Enter your password to confirm</label>
          <input id="delpw" type="password" autoComplete="current-password" className="field" value={password} onChange={(e) => setPassword(e.target.value)} />
          <div className="flex gap-3">
            <button type="button" className="btn bg-danger text-paper" disabled={!password || busy} onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                await accountApi.deleteAccount(password);
                setUser(null);
                router.replace('/?account=deleted');
              } catch (e) {
                setError(e as ApiError);
                setBusy(false);
              }
            }}>Delete permanently</button>
            <button type="button" className="btn btn-secondary" onClick={() => setConfirming(false)}>Cancel</button>
          </div>
        </div>
      )}
      {error && <ErrorState message={error.message} />}
    </section>
  );
}
