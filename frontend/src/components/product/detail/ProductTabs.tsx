'use client';

import { useEffect, useState } from 'react';
import type { SpecRow } from '@/lib/types';
import { Reviews } from '../Reviews';

type Tab = 'description' | 'specification' | 'reviews';

/** Description / Specification / Reviews (n). Links to #reviews or #write-review open the reviews tab. */
export function ProductTabs({ slug, name, description, specs, reviewCount }: { slug: string; name: string; description: string; specs: SpecRow[]; reviewCount: number }) {
  const [tab, setTab] = useState<Tab>('description');
  const [writeNow, setWriteNow] = useState(false);

  useEffect(() => {
    const sync = () => {
      const h = window.location.hash;
      if (h === '#reviews' || h === '#write-review') {
        setTab('reviews');
        setWriteNow(h === '#write-review');
        document.getElementById('product-tabs')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      }
    };
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  const tabs: [Tab, string][] = [
    ['description', 'Description'],
    ...(specs.length ? ([['specification', 'Specification']] as [Tab, string][]) : []),
    ['reviews', `Reviews (${reviewCount})`],
  ];

  return (
    <section id="product-tabs" aria-label="Product information" className="mt-8 scroll-mt-4">
      <div role="tablist" className="flex flex-wrap">
        {tabs.map(([id, label]) => (
          <button key={id} role="tab" type="button" id={`tab-${id}`} aria-selected={tab === id} aria-controls={`panel-${id}`} onClick={() => setTab(id)}
            className={`-mb-px border border-flour px-5 py-3 text-[15px] ${tab === id ? 'border-b-paper bg-paper text-burgundy' : 'bg-cream text-charcoal hover:text-burgundy'}`}>
            {label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="border border-flour bg-paper p-5 sm:p-6">
        {tab === 'description' && <Description text={description} />}
        {tab === 'specification' && <Specification rows={specs} />}
        {tab === 'reviews' && <Reviews slug={slug} productName={name} embedded startWriting={writeNow} />}
      </div>
    </section>
  );
}

/** Paragraphs from blank lines; lines starting "- " become bullets; a line ending ":" becomes a subheading. */
export function Description({ text }: { text: string }) {
  const blocks = text.trim().split(/\n\s*\n/);
  return (
    <div className="max-w-prose space-y-4 text-[15px] leading-relaxed">
      {blocks.map((b, i) => {
        const lines = b.split('\n').map((l) => l.trim()).filter(Boolean);
        if (lines.length && lines.every((l) => l.startsWith('- '))) {
          return <ul key={i} className="list-disc space-y-1 pl-5">{lines.map((l) => <li key={l}>{l.slice(2)}</li>)}</ul>;
        }
        if (lines.length === 1 && lines[0].endsWith(':')) return <h3 key={i} className="font-sans text-xl font-normal text-charcoal">{lines[0].slice(0, -1)}</h3>;
        return <p key={i} className="whitespace-pre-line">{b.trim()}</p>;
      })}
    </div>
  );
}

export function Specification({ rows }: { rows: SpecRow[] }) {
  const groups = new Map<string, SpecRow[]>();
  for (const r of rows) groups.set(r.group || 'Details', [...(groups.get(r.group || 'Details') ?? []), r]);
  return (
    <table className="w-full border border-flour text-[15px]">
      {[...groups.entries()].map(([g, list]) => (
        <tbody key={g}>
          <tr><th colSpan={2} scope="colgroup" className="border border-flour px-3 py-2.5 text-left font-semibold text-burgundy">{g}</th></tr>
          {list.map((r) => (
            <tr key={`${g}-${r.name}`}>
              <th scope="row" className="w-1/2 border border-flour px-3 py-2.5 text-left font-normal">{r.name}</th>
              <td className="border border-flour px-3 py-2.5">{r.value}</td>
            </tr>
          ))}
        </tbody>
      ))}
    </table>
  );
}
