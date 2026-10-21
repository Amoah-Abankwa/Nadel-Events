import type { Metadata } from 'next';
import Link from 'next/link';
import { EmptyState } from '@/components/support/EmptyState';
import { serverGet } from '@/lib/api/server';

export const metadata: Metadata = { title: 'Promotions' };

type Item = { slug: string; name: string; headline: string; body: string; endsAt: string | null; couponCode: string | null };

export default async function PromotionsPage() {
  const items = await serverGet<Item[]>('/campaigns/active', 60).catch(() => [] as Item[]);
  return (
    <>
      <h1 className="mb-8 text-4xl">Promotions</h1>
      {items.length === 0 ? (
        <EmptyState title="No promotions running right now" body="Check back soon, or see what’s new in the shop." action={{ href: '/shop', label: 'Browse the shop' }} />
      ) : (
        <ul className="divide-y divide-flour border-y border-flour">
          {items.map((c) => (
            <li key={c.slug}>
              <Link href={`/promotions/${c.slug}`} className="group block py-6">
                <h2 className="text-3xl group-hover:text-burgundy">{c.headline || c.name}</h2>
                {c.body && <p className="mt-2 line-clamp-2 max-w-2xl text-muted">{c.body}</p>}
                <p className="mt-2 text-sm">
                  {c.couponCode && <>Use code <strong className="font-mono">{c.couponCode}</strong>. </>}
                  {c.endsAt && <>Ends {new Date(c.endsAt).toLocaleDateString('en-GH', { day: 'numeric', month: 'long', timeZone: 'UTC' })}.</>}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
