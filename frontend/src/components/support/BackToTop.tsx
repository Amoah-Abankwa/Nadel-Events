'use client';

import { useEffect, useState } from 'react';
import { IconArrowUp } from '@/components/icons/Icons';

export function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const on = () => setShow(window.scrollY > 900);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  if (!show) return null;
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })}
      className="fixed right-4 z-40 inline-flex size-11 items-center justify-center rounded-full bg-burgundy text-paper shadow-md hover:bg-burgundy-deep"
      style={{ bottom: 'max(5rem, calc(env(safe-area-inset-bottom) + 4.5rem))' }}
      aria-label="Back to top"
    >
      <IconArrowUp className="size-5" />
    </button>
  );
}
