import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ApiError } from '@/lib/api/errors';
import type { CampaignPage } from '@/lib/api/marketing';
import { serverGet } from '@/lib/api/server';

type Props = { params: Promise<{ slug: string }> };

async function get(slug: string) {
  try {
    return await serverGet<CampaignPage>(`/campaigns/${encodeURIComponent(slug)}`, 60);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await get((await params).slug);
  return { title: c.headline || c.name, description: c.body?.slice(0, 160), openGraph: c.heroImage ? { images: [c.heroImage] } : undefined };
}

export default async function CampaignLanding({ params }: Props) {
  const c = await get((await params).slug);
  return (
    <>
      <section className="grid items-center gap-8 border-b border-flour pb-12 md:grid-cols-2">
        <div>
          <h1 className="text-5xl leading-[1.05]">{c.headline || c.name}</h1>
          {c.body && <p className="mt-5 max-w-xl whitespace-pre-line text-lg text-muted">{c.body}</p>}
          {c.couponCode && (
            <p className="mt-6 inline-block rounded-md border border-dashed border-cocoa px-4 py-3">
              Use code <strong className="font-mono text-lg">{c.couponCode}</strong> at checkout
            </p>
          )}
          {c.endsAt && <p className="mt-4 text-sm text-muted">Ends {new Date(c.endsAt).toLocaleString('en-GH', { dateStyle: 'long', timeStyle: 'short', timeZone: 'UTC' })} (Ghana time).</p>}
        </div>
        {c.heroImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.heroImage} alt="" className="aspect-[4/3] w-full rounded-md border border-flour object-cover" />
        )}
      </section>
      {c.products.length > 0 && <div className="mt-12"><ProductGrid products={c.products} /></div>}
    </>
  );
}
