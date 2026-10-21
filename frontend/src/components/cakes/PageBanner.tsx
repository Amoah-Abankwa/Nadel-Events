import Link from 'next/link';
import { ScallopEdge } from './Shapes';

/** Sky-blue title band under the ribbon header: spaced script title, breadcrumb, scalloped bottom. */
export function PageBanner({ title, crumbs }: { title: string; crumbs: { label: string; href?: string }[] }) {
  return (
    <div className="relative bg-sky">
      <div className="mx-auto max-w-6xl px-6 pb-16 pt-40 text-center sm:pt-48">
        <h1 className="font-script text-5xl font-normal uppercase tracking-[0.25em] text-[#2F7F93] sm:text-6xl" style={{ color: undefined }}>{title}</h1>
        <nav aria-label="Breadcrumb" className="mt-4 text-sm text-charcoal/80">
          <ol className="flex flex-wrap justify-center gap-2">
            <li><Link href="/cakes" className="hover:text-rose">Home</Link></li>
            {crumbs.map((c, i) => (
              <li key={c.label} className="flex gap-2">
                <span aria-hidden>/</span>
                {c.href && i < crumbs.length - 1 ? <Link href={c.href} className="hover:text-rose">{c.label}</Link> : <span aria-current="page">{c.label}</span>}
              </li>
            ))}
          </ol>
        </nav>
      </div>
      <div className="absolute inset-x-0 bottom-0"><ScallopEdge fill="var(--color-paper)" /></div>
    </div>
  );
}

/** Small script section heading used inside cake pages ("Products", "Order summary", "Contact form"). */
export function ScriptTitle({ id, children }: { id?: string; children: React.ReactNode }) {
  return <h2 id={id} className="font-script text-3xl font-normal text-charcoal" style={{ color: undefined }}>{children}</h2>;
}
