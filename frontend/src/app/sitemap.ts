import type { MetadataRoute } from 'next';
import type { Category, Paginated, ProductCard } from '@/lib/types';
import { flattenAll } from '@/lib/departments';

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const API = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

async function get<T>(path: string): Promise<T | null> {
  try {
    const r = await fetch(`${API}${path}`, { next: { revalidate: 3600 } });
    return r.ok ? ((await r.json()) as T) : null;
  } catch {
    return null;
  }
}

/** XML sitemap for search engines: static pages, every category and every published product. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const statics = ['', '/decor', '/decor/shop', '/cakes', '/cakes/shop', '/cakes/contact', '/shop', '/specials', '/brands', '/services', '/promotions', '/giveaways', '/contact', '/delivery', '/returns', '/sitemap'].map((p) => ({ url: `${SITE}${p}`, changeFrequency: 'weekly' as const }));

  const categories = flattenAll((await get<Category[]>('/categories')) ?? []).map((c) => ({ url: `${SITE}/categories/${c.slug}`, changeFrequency: 'daily' as const }));

  const products: MetadataRoute.Sitemap = [];
  for (let page = 1; page <= 50; page++) {
    const data = await get<Paginated<ProductCard>>(`/products?limit=100&page=${page}`);
    if (!data) break;
    products.push(...data.items.map((p) => ({ url: `${SITE}/products/${p.slug}`, changeFrequency: 'weekly' as const })));
    if (page >= data.totalPages) break;
  }
  return [...statics, ...categories, ...products];
}
