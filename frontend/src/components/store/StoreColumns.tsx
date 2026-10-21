import { CategoryPanel } from '@/components/home/CategoryPanel';
import { DealSpotlight } from '@/components/home/SidebarProducts';
import { serverGet } from '@/lib/api/server';
import type { Category, Paginated, ProductCard } from '@/lib/types';
import { Breadcrumbs, type Crumb } from './Breadcrumbs';

/**
 * Inner-page layout from the reference: category menu and hot deals on the left,
 * breadcrumb bar and page content on the right. `filters` adds a box under the category menu.
 */
export async function StoreColumns({ crumbs, children, filters }: { crumbs: Crumb[]; children: React.ReactNode; filters?: React.ReactNode }) {
  const [categories, onSale, featured] = await Promise.all([
    serverGet<Category[]>('/categories', 300).catch(() => [] as Category[]),
    serverGet<Paginated<ProductCard>>('/products?onSale=true&limit=6', 60).catch(() => null),
    serverGet<Paginated<ProductCard>>('/products?featured=true&limit=6', 60).catch(() => null),
  ]);
  const deals = onSale?.items.length ? onSale.items : featured?.items ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-[16.5rem_1fr]">
      <aside className="order-2 space-y-6 lg:order-1" aria-label="Browse">
        <div className="hidden lg:block"><CategoryPanel categories={categories} /></div>
        {filters}
        <div className="hidden lg:block"><DealSpotlight products={deals} /></div>
      </aside>
      <div className="order-1 min-w-0 lg:order-2">
        <Breadcrumbs items={crumbs} />
        {children}
      </div>
    </div>
  );
}
