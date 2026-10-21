'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** Prev/next paging for a horizontal scroll-snap row; also works with touch swipe and keyboard scroll. */
export function useScroller<T extends HTMLElement>(deps: unknown[] = []) {
  const ref = useRef<T>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    el?.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [update, ...deps]);

  const page = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: smooth ? 'smooth' : 'auto' });
  };

  return { ref, atStart, atEnd, prev: () => page(-1), next: () => page(1) };
}
