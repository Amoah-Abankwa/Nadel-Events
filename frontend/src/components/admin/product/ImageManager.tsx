'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import { adminApi } from '@/lib/api/admin';
import type { ApiError } from '@/lib/api/errors';

/** Upload, reorder and remove product photos. The first image is the main one. */
export function ImageManager({ images, onChange }: { images: string[]; onChange: (next: string[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(undefined);
    const added: string[] = [];
    for (const f of Array.from(files).slice(0, 12 - images.length)) {
      if (f.size > 5 * 1024 * 1024) { setError(`${f.name} is larger than 5 MB.`); continue; }
      try {
        added.push((await adminApi.uploadImage(f)).url);
      } catch (e) {
        setError((e as ApiError).message);
      }
    }
    onChange([...images, ...added]);
    setBusy(false);
    if (input.current) input.current.value = '';
  }

  const move = (i: number, dir: -1 | 1) => {
    const next = [...images];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    onChange(next);
  };

  return (
    <div>
      {images.length > 0 && (
        <ul className="mb-3 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {images.map((src, i) => (
            <li key={src} className="text-xs">
              <div className="relative aspect-square overflow-hidden rounded-sm border border-flour bg-flour">
                <Image src={src} alt={`Product image ${i + 1}`} fill sizes="120px" className="object-cover" />
                {i === 0 && <span className="absolute left-1 top-1 rounded-sm bg-paper px-1.5 py-0.5 font-semibold">Main</span>}
              </div>
              <div className="mt-1 flex justify-between">
                <button type="button" className="underline disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move image ${i + 1} earlier`}>Earlier</button>
                <button type="button" className="text-danger underline" onClick={() => onChange(images.filter((_, j) => j !== i))} aria-label={`Remove image ${i + 1}`}>Remove</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <input ref={input} id="images" type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => upload(e.target.files)} />
      <label htmlFor="images" className={`btn btn-secondary cursor-pointer ${busy ? 'pointer-events-none opacity-60' : ''}`}>{busy ? 'Uploading…' : 'Upload photos'}</label>
      <p className="mt-1 text-xs text-muted">JPG, PNG or WebP, up to 5 MB each. Square photos on a plain background look best.</p>
      {error && <p className="mt-1 text-xs text-danger" role="alert">{error}</p>}
    </div>
  );
}
