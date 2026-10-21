'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Shared carousel behaviour for every hero slider: wraps around, auto-advances,
 * pauses on hover/focus, and never auto-advances when the visitor prefers reduced motion.
 */
export function useSlider(count: number, intervalMs = 6000) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const go = useCallback((n: number) => setIndex(((n % count) + count) % count), [count]);

  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);
  useEffect(() => {
    if (paused || reduced || count < 2) return;
    const t = setTimeout(() => go(index + 1), intervalMs);
    return () => clearTimeout(t);
  }, [index, paused, reduced, go, count, intervalMs]);

  /** Spread onto the slider's root element. */
  const pauseHandlers = {
    onMouseEnter: () => setPaused(true),
    onMouseLeave: () => setPaused(false),
    onFocusCapture: () => setPaused(true),
    onBlurCapture: () => setPaused(false),
  };
  return { index, go, pauseHandlers };
}
