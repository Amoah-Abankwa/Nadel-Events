'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { pageWindow } from '@/lib/format';

/** "Default sorting" select, kept in the URL. */
export function SortSelect() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  return (
    <div>
      <label htmlFor="d-sort" className="sr-only">Sort products</label>
      <select id="d-sort" value={params.get('sort') ?? ''} className="h-10 w-60 border border-petal-deep bg-paper px-3 font-light text-taupe"
        onChange={(e) => { const p = new URLSearchParams(params.toString()); if (e.target.value) p.set('sort', e.target.value); else p.delete('sort'); p.delete('page'); router.push(`${pathname}${p.size ? `?${p}` : ''}`); }}>
        <option value="">Default sorting (newest)</option>
        <option value="name">Sort by name</option>
        <option value="price_asc">Sort by price: low to high</option>
        <option value="price_desc">Sort by price: high to low</option>
      </select>
    </div>
  );
}

/** Square page buttons with a next/previous arrow. */
export function SquarePager({ page, totalPages }: { page: number; totalPages: number }) {
  const params = useSearchParams();
  const pathname = usePathname();
  if (totalPages <= 1) return null;
  const href = (n: number) => { const p = new URLSearchParams(params.toString()); p.set('page', String(n)); return `${pathname}?${p}`; };
  const cls = 'inline-flex size-9 items-center justify-center border border-petal-deep text-sm hover:border-taupe';
  return (
    <nav aria-label="Pagination" className="mt-12 flex gap-1.5">
      {page > 1 && <Link href={href(page - 1)} className={cls} aria-label="Previous page">←</Link>}
      {pageWindow(page, totalPages).map((n) => (
        <Link key={n} href={href(n)} aria-current={n === page ? 'page' : undefined} className={`${cls} ${n === page ? 'font-semibold text-taupe' : ''}`}>{n}</Link>
      ))}
      {page < totalPages && <Link href={href(page + 1)} className={cls} aria-label="Next page">→</Link>}
    </nav>
  );
}
