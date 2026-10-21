'use client';

import { useState } from 'react';
import { ProductImage } from '../ProductImage';

/** Main photo with a thumbnail strip underneath. */
export function Gallery({ images, name }: { images: string[]; name: string }) {
  const [i, setI] = useState(0);
  const list = images.length ? images : [''];
  return (
    <div>
      <div className="relative aspect-square overflow-hidden bg-paper">
        <ProductImage src={list[i] || undefined} alt={i === 0 ? name : `${name}, photo ${i + 1}`} sizes="(min-width: 1024px) 26rem, (min-width: 768px) 45vw, 100vw" priority />
      </div>
      {images.length > 1 && (
        <ul className="mt-3 grid grid-cols-4 gap-3" aria-label="More photos">
          {images.slice(0, 8).map((src, n) => (
            <li key={src}>
              <button type="button" onClick={() => setI(n)} aria-label={`Show photo ${n + 1}`} aria-current={n === i}
                className={`relative block aspect-square w-full overflow-hidden border-2 bg-paper ${n === i ? 'border-burgundy' : 'border-transparent hover:border-crust'}`}>
                <ProductImage src={src} alt="" sizes="6rem" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
