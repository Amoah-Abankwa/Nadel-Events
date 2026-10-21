import Link from 'next/link';
import { IconChevronRight } from '@/components/icons/Icons';

export interface Crumb {
  label: string;
  href?: string;
}

/** White breadcrumb bar: home icon › … › current page. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-5 bg-paper px-4 py-2.5 text-[15px] shadow-[0_1px_6px_var(--color-panel-shadow)]">
      <ol className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <li>
          <Link href="/" className="inline-flex text-charcoal hover:text-burgundy" aria-label="Home">
            <svg aria-hidden viewBox="0 0 24 24" className="size-[18px]" fill="currentColor"><path d="M12 3 2 11.5h3V21h5.5v-6h3v6H19v-9.5h3z" /></svg>
          </Link>
        </li>
        {items.map((c, i) => (
          <li key={`${c.label}-${i}`} className="flex items-center gap-3">
            <IconChevronRight className="size-4 text-charcoal" />
            {c.href && i < items.length - 1 ? (
              <Link href={c.href} className="tracking-wide hover:text-burgundy">{c.label}</Link>
            ) : (
              <span aria-current="page" className="tracking-wide">{c.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
