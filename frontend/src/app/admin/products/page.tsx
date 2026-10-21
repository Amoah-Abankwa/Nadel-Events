'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { LinkButton, PageHeader, Pager, StatusBadge, Table } from '@/components/admin/ui';
import { ErrorState } from '@/components/support/ErrorState';
import { Skeleton } from '@/components/support/Skeleton';
import { adminApi } from '@/lib/api/admin';
import { formatMoney } from '@/lib/format';
import { useLoad } from '@/hooks/use-load';

function ProductsList() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const q = { q: params.get('q') ?? undefined, status: params.get('status') ?? undefined, lowStock: params.get('lowStock') ?? undefined, page: Number(params.get('page') ?? 1) };
  const { data, error, loading, reload } = useLoad(() => adminApi.products({ ...q, limit: 25 }), [params.toString()]);

  const set = (next: Record<string, string | undefined>) => {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) (v ? p.set(k, v) : p.delete(k));
    if (!('page' in next)) p.delete('page');
    router.push(`${pathname}?${p.toString()}`);
  };

  return (
    <>
      <PageHeader title="Products and stock" actions={<LinkButton href="/admin/products/new" primary>Add product</LinkButton>} />
      <form className="mb-4 flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); set({ q: String(new FormData(e.currentTarget).get('q') ?? '') || undefined }); }}>
        <div className="w-64">
          <label htmlFor="q" className="label">Name or SKU</label>
          <input id="q" name="q" type="search" defaultValue={q.q} className="field" />
        </div>
        <div className="w-40">
          <label htmlFor="status" className="label">Status</label>
          <select id="status" className="field" value={q.status ?? ''} onChange={(e) => set({ status: e.target.value || undefined })}>
            <option value="">All</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-burgundy" checked={q.lowStock === '1'} onChange={(e) => set({ lowStock: e.target.checked ? '1' : undefined })} />
          Low stock only (5 or fewer)
        </label>
        <button type="submit" className="btn btn-secondary">Search</button>
      </form>

      {error && <ErrorState message={error.message} onRetry={reload} />}
      {loading && !data && <Skeleton className="h-64" />}
      {data && (
        <>
          <Table caption="Products">
            <thead><tr><th>Product</th><th>Category</th><th>Status</th><th className="text-right">Price</th><th className="text-right">Available</th></tr></thead>
            <tbody>
              {data.items.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-muted">No products found.</td></tr>}
              {data.items.map((p) => {
                const tracked = p.variants.filter((v) => v.trackStock && v.isActive);
                const available = tracked.reduce((n, v) => n + Math.max(0, v.stockOnHand - v.stockReserved), 0);
                return (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/admin/products/${p.id}`} className="font-semibold text-burgundy hover:underline">{p.name}</Link>
                      {p.variants.length > 1 && <span className="block text-xs text-muted">{p.variants.length} options</span>}
                    </td>
                    <td>{p.category?.name}</td>
                    <td><StatusBadge status={p.status} /></td>
                    <td className="text-right">{formatMoney(p.basePrice)}</td>
                    <td className={`text-right ${tracked.length && available <= 5 ? 'font-semibold text-danger' : ''}`}>{tracked.length ? available : 'Not tracked'}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
          <Pager page={data.page} totalPages={data.totalPages} onPage={(p) => set({ page: String(p) })} />
        </>
      )}
    </>
  );
}

export default function ProductsPage() {
  return <Suspense fallback={<Skeleton className="h-64" />}><ProductsList /></Suspense>;
}
