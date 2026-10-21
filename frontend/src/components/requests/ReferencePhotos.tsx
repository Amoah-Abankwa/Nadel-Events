'use client';

import { useState } from 'react';
import type { ApiError } from '@/lib/api/errors';
import { requestsApi } from '@/lib/api/requests';

export interface UploadedPhoto {
  path: string;
  previewUrl: string;
}

const MAX = 5;

/** Private uploads: previews use short-lived signed URLs, so plain <img> is used (no Next image optimisation). */
export function ReferencePhotos({ value, onChange }: { value: UploadedPhoto[]; onChange: (v: UploadedPhoto[]) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function add(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(undefined);
    const next = [...value];
    for (const f of Array.from(files).slice(0, MAX - value.length)) {
      if (f.size > 5 * 1024 * 1024) { setError(`${f.name} is larger than 5 MB.`); continue; }
      try {
        next.push(await requestsApi.upload(f));
      } catch (e) {
        setError((e as ApiError).message);
      }
    }
    onChange(next);
    setBusy(false);
  }

  return (
    <div>
      {value.length > 0 && (
        <ul className="mb-3 flex flex-wrap gap-3">
          {value.map((p, i) => (
            <li key={p.path} className="w-24 text-xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.previewUrl} alt={`Reference photo ${i + 1}`} className="aspect-square w-24 rounded-sm border border-flour object-cover" />
              <button type="button" className="mt-1 text-danger underline" onClick={() => onChange(value.filter((x) => x.path !== p.path))}>Remove</button>
            </li>
          ))}
        </ul>
      )}
      {value.length < MAX && (
        <>
          <input id="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => { add(e.target.files); e.target.value = ''; }} />
          <label htmlFor="photos" className={`btn btn-secondary cursor-pointer ${busy ? 'pointer-events-none opacity-60' : ''}`}>{busy ? 'Uploading…' : 'Add photos'}</label>
        </>
      )}
      <p className="mt-1 text-xs text-muted">Up to {MAX} photos of designs you like (JPG, PNG or WebP, 5 MB each). Only our team can see them.</p>
      {error && <p className="mt-1 text-xs text-danger" role="alert">{error}</p>}
    </div>
  );
}
