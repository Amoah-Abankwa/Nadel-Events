'use client';

import Link from 'next/link';
import { ProductImage } from '@/components/product/ProductImage';
import { EmptyNotice } from '@/components/store/EmptyNotice';
import { RelatedProducts } from '@/components/product/RelatedProducts';
import { ErrorState } from '@/components/support/ErrorState';
import { Skeleton } from '@/components/support/Skeleton';
import { accountApi } from '@/lib/api/account';
import { formatMoney } from '@/lib/format';
import { useLoad } from '@/hooks/use-load';

export default function WishlistPage() {
  const { data, error, reload, setData } = useLoad(() => accountApi.wishlist(), []);
  if (error) return <ErrorState message={error.message} onRetry={reload} />;
  if (!data) return <Skeleton className="h-48" />;
  return (
    <>
      <h1 className="mb-4 font-sans text-2xl font-normal text-charcoal">My wish list</h1>
      {data.length === 0 ? (
        <EmptyNotice text="Your wish list is empty. Tap the heart on any cake, decoration or kitchen item to save it here." />
      ) : (
        <ul className="grid grid-cols-2 gap-6 sm:grid-cols-3">
          {data.map((p) => (
            <li key={p.id}>
              <Link href={`/products/${p.slug}`} className="block">
                <div className="relative aspect-[4/5] overflow-hidden rounded-sm border border-flour"><ProductImage src={p.images[0]} alt={p.name} sizes="33vw" /></div>
                <p className="mt-2 font-semibold">{p.name}</p>
              </Link>
              <p className="text-sm">{formatMoney(p.basePrice)}</p>
              <button type="button" className="mt-1 text-sm text-muted underline" onClick={async () => { await accountApi.removeWish(p.id).catch(() => undefined); setData(data.filter((x) => x.id !== p.id)); }}>
                Remove<span className="sr-only"> {p.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {data && <RelatedProducts title={data.length ? 'You might also like' : 'Popular right now'} basedOn={data.map((p) => p.id)} exclude={data.map((p) => p.id)} />}
    </>
  );
}
