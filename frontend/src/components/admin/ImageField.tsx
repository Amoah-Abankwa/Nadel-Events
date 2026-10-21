'use client';

import { useState } from 'react';
import { adminApi } from '@/lib/api/admin';
import type { ApiError } from '@/lib/api/errors';

/** One uploaded image (Cloudinary, public delivery). Shows a preview and lets staff replace or clear it. */
export function ImageField({ id, label, value, onChange, hint, required }: { id: string; label: string; value: string | null; onChange: (url: string | null) => void; hint?: string; required?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  return (
    <div>
      <p className="label" id={`${id}-l`}>{label}{required ? '' : ' (optional)'}</p>
      {value && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" className="mb-2 max-h-40 rounded-sm border border-flour object-cover" />
      )}
      <div className="flex flex-wrap items-center gap-3">
        <input id={id} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-labelledby={`${id}-l`}
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            if (f.size > 5 * 1024 * 1024) return setError('Use an image under 5 MB.');
            setBusy(true); setError(undefined);
            try { onChange((await adminApi.uploadImage(f)).url); } catch (err) { setError((err as ApiError).message); }
            setBusy(false);
          }} />
        <label htmlFor={id} className={`btn btn-secondary cursor-pointer ${busy ? 'pointer-events-none opacity-60' : ''}`}>{busy ? 'Uploading…' : value ? 'Replace image' : 'Upload image'}</label>
        {value && !required && <button type="button" className="text-sm underline" onClick={() => onChange(null)}>Remove</button>}
      </div>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p className="mt-1 text-xs text-danger" role="alert">{error}</p>}
    </div>
  );
}

// Ghana is UTC+0: datetime-local values are read and written as UTC.
export const toLocalInput = (iso: string | null | undefined) => (iso ? iso.slice(0, 16) : '');
export const fromLocalInput = (v: string) => (v ? `${v}:00.000Z` : null);
export const shortWhen = (iso: string) => new Date(iso).toLocaleString('en-GH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });

export function liveState(x: { status: string; startsAt?: string | null; endsAt?: string | null }) {
  const now = Date.now();
  if (x.status !== 'PUBLISHED') return x.status === 'DRAFT' ? 'Draft' : 'Archived';
  if (x.startsAt && new Date(x.startsAt).getTime() > now) return 'Scheduled';
  if (x.endsAt && new Date(x.endsAt).getTime() <= now) return 'Ended';
  return 'Live';
}
