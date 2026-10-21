import type { Metadata } from 'next';
import Link from 'next/link';
import { StoreColumns } from '@/components/store/StoreColumns';
import { serverGet } from '@/lib/api/server';

export const metadata: Metadata = { title: 'Brands', description: 'Kitchenware, baking and decoration brands we stock.' };

export default async function BrandsPage() {
  const brands = await serverGet<{ name: string; count: number }[]>('/brands', 300).catch(() => []);
  const groups = new Map<string, typeof brands>();
  for (const b of brands) {
    const first = b.name[0].toUpperCase();
    const key = /[A-Z]/.test(first) ? first : '0–9';
    groups.set(key, [...(groups.get(key) ?? []), b]);
  }
  const letters = [...groups.keys()];

  return (
    <StoreColumns crumbs={[{ label: 'Brands' }]}>
      <h1 className="font-sans text-2xl font-normal text-charcoal">Find your favourite brand</h1>
      <p className="mt-1 text-sm text-muted">Kitchenware, baking tools and decoration from makers we trust. Our cakes and pastries are made by us.</p>
      {letters.length === 0 ? (
        <p className="mt-6">No brands listed yet.</p>
      ) : (
        <>
          <nav aria-label="Brand index" className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="font-semibold">Brand index:</span>
            {letters.map((l) => <a key={l} href={`#brand-${l}`} className="hover:text-burgundy">{l}</a>)}
          </nav>
          {letters.map((l) => (
            <section key={l} id={`brand-${l}`} aria-labelledby={`brand-h-${l}`} className="mt-6 scroll-mt-4">
              <h2 id={`brand-h-${l}`} className="font-sans text-3xl font-normal text-charcoal">{l}</h2>
              <ul className="mt-2 grid gap-x-8 gap-y-2 sm:grid-cols-3">
                {groups.get(l)!.map((b) => (
                  <li key={b.name}><Link href={`/shop?brand=${encodeURIComponent(b.name)}`} className="hover:text-burgundy">{b.name}</Link> <span className="text-xs text-muted">({b.count})</span></li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </StoreColumns>
  );
}
