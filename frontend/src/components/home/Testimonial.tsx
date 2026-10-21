import Link from 'next/link';
import { Stars } from '@/components/product/Stars';

export interface ReviewHighlight {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  author: string;
  verifiedPurchase: boolean;
  product: { name: string; slug: string };
}

/** A real, approved customer review (the reference's portrait-and-quote card). Initials instead of photos. */
export function Testimonial({ review }: { review?: ReviewHighlight }) {
  if (!review) return null;
  const initials = review.author.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <figure className="bg-paper p-6 text-center shadow-[0_1px_6px_var(--color-panel-shadow)]">
      <span aria-hidden className="mx-auto flex size-20 items-center justify-center rounded-full bg-flour font-display text-2xl text-cocoa">{initials}</span>
      <figcaption className="mt-3">
        <span className="block text-lg text-burgundy">{review.author}</span>
        {review.verifiedPurchase && <span className="text-xs text-muted">Verified buyer</span>}
      </figcaption>
      <div className="mt-2 flex justify-center"><Stars value={review.rating} /></div>
      <blockquote className="mt-3 line-clamp-6 text-sm leading-relaxed text-muted">{review.title ? <strong className="block text-charcoal">{review.title}</strong> : null}{review.body}</blockquote>
      <Link href={`/products/${review.product.slug}`} className="mt-3 inline-block text-xs font-semibold text-cocoa underline underline-offset-2">{review.product.name}</Link>
    </figure>
  );
}
