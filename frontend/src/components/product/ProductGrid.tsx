import type { ProductCard as Card } from '@/lib/types';
import { ProductCard } from './ProductCard';

export function ProductGrid({ products }: { products: Card[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((p, i) => (
        <li key={p.id}><ProductCard product={p} priority={i < 4} /></li>
      ))}
    </ul>
  );
}
