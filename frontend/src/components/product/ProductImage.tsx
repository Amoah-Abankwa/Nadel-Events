import Image from 'next/image';

/** Shows the product photo, or a quiet named placeholder until photography is supplied. */
export function ProductImage({ src, alt, sizes, priority = false }: { src?: string; alt: string; sizes: string; priority?: boolean }) {
  if (src) {
    return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />;
  }
  return (
    <div className="flex h-full w-full items-end bg-flour p-4" role="img" aria-label={alt}>
      <span aria-hidden className="font-display text-lg leading-tight text-cocoa/60">{alt}</span>
    </div>
  );
}
