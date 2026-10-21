import Link from 'next/link';
import { CategoryIcon, IconChevronDown, IconMenu, IconPlus } from '@/components/icons/Icons';
import type { Category } from '@/lib/types';

const SHOWN = 8;

/** Left category menu with icons; sub-categories open in place (works without JavaScript). */
export function CategoryPanel({ categories }: { categories: Category[] }) {
  if (!categories.length) return null;
  return (
    <nav aria-labelledby="cat-panel-h" className="bg-paper shadow-[0_1px_6px_var(--color-panel-shadow)]">
      <h2 id="cat-panel-h" className="flex items-center gap-3 bg-burgundy px-5 py-3.5 font-sans text-base font-semibold uppercase tracking-wide text-paper">
        <IconMenu className="size-5" /> Categories
      </h2>
      <ul className="px-4 py-1">
        {categories.slice(0, SHOWN).map((c) => (
          <li key={c.id} className="border-b border-flour last:border-0">
            {c.children.length > 0 ? (
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center gap-3 py-3 text-[15px] hover:text-burgundy [&::-webkit-details-marker]:hidden">
                  <CategoryIcon slug={c.slug} className="size-5 text-muted" />
                  <span className="flex-1">{c.name}</span>
                  <IconChevronDown className="size-4 text-muted transition-transform group-open:rotate-180" />
                </summary>
                <ul className="mb-2 ml-8 space-y-1 text-sm">
                  <li><Link href={`/categories/${c.slug}`} className="block py-1 font-semibold hover:text-burgundy">All {c.name.toLowerCase()}</Link></li>
                  {c.children.map((s) => <li key={s.id}><Link href={`/categories/${s.slug}`} className="block py-1 hover:text-burgundy">{s.name}</Link></li>)}
                </ul>
              </details>
            ) : (
              <Link href={`/categories/${c.slug}`} className="flex items-center gap-3 py-3 text-[15px] hover:text-burgundy">
                <CategoryIcon slug={c.slug} className="size-5 text-muted" /> {c.name}
              </Link>
            )}
          </li>
        ))}
        <li>
          <Link href="/shop" className="flex items-center gap-3 py-3 text-[15px] font-semibold hover:text-burgundy">
            <IconPlus className="size-4" /> {categories.length > SHOWN ? 'More categories' : 'Shop everything'}
          </Link>
        </li>
      </ul>
    </nav>
  );
}
