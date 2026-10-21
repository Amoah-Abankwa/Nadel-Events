import type { Metadata } from 'next';
import Link from 'next/link';
import { EmptyState } from '@/components/support/EmptyState';
import type { PublicGiveaway } from '@/lib/api/marketing';
import { serverGet } from '@/lib/api/server';

export const metadata: Metadata = { title: 'Giveaways' };

const when = (iso: string) => new Date(iso).toLocaleString('en-GH', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });

export default async function GiveawaysPage() {
  const items = await serverGet<PublicGiveaway[]>('/giveaways', 60).catch(() => [] as PublicGiveaway[]);
  return (
    <>
      <h1 className="mb-8 text-4xl">Giveaways</h1>
      {items.length === 0 ? (
        <EmptyState title="No giveaways right now" body="Follow us for the next one." />
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2">
          {items.map((g) => (
            <li key={g.slug} className="panel overflow-hidden">
              <Link href={`/giveaways/${g.slug}`} className="block">
                {g.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={g.imageUrl} alt="" className="aspect-[16/9] w-full object-cover" />
                )}
                <div className="p-5">
                  <p className="text-sm font-semibold text-burgundy">{g.state === 'OPEN' ? `Open until ${when(g.closesAt)}` : g.state === 'UPCOMING' ? `Opens ${when(g.opensAt)}` : g.winner ? `Winner: ${g.winner}` : 'Closed. Winner coming soon.'}</p>
                  <h2 className="mt-1 text-2xl">{g.title}</h2>
                  <p className="mt-1 text-muted">Prize: {g.prize}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
