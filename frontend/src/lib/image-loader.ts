'use client';

/**
 * next/image loader: Cloudinary resizes and converts (f_auto, q_auto) at its edge,
 * so product photos never pass through the Next.js server.
 */
export default function cloudinaryLoader({ src, width, quality }: { src: string; width: number; quality?: number }) {
  if (src.includes('res.cloudinary.com') && src.includes('/image/upload/')) {
    return src.replace('/image/upload/', `/image/upload/f_auto,q_${quality ?? 'auto'},w_${width},c_limit/`);
  }
  return src; // anything else is served as-is
}
