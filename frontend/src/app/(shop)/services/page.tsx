import type { Metadata } from 'next';
import Link from 'next/link';
import { serverGet } from '@/lib/api/server';
import type { ServiceOption } from '@/lib/api/requests';

export const metadata: Metadata = { title: 'Custom cakes and events', description: 'Request a quote for a custom cake, pastries, event decoration or catering.' };

export default async function ServicesPage() {
  const data = await serverGet<{ leadDays: number; services: ServiceOption[] }>('/services', 300).catch(() => null);

  return (
    <>
      <h1 className="max-w-3xl text-5xl leading-[1.05]">Made for your day.</h1>
      <p className="mt-5 max-w-xl text-lg text-muted">
        Tell us the date, the guests and the look you want. We’ll reply with a quote. Accept it and pay the deposit online to book your date.
      </p>

      <ol className="mt-10 grid gap-6 border-y border-flour py-8 sm:grid-cols-3">
        {[
          ['Send your request', 'Share the date, rough guest numbers and photos of designs you like.'],
          ['Get a quote', 'We price it and tell you exactly what’s included. Usually within a working day.'],
          ['Pay the deposit', 'Accept online and pay the deposit to lock in your date. The balance is due on collection or delivery.'],
        ].map(([title, body], i) => (
          <li key={title}>
            <p className="font-display text-3xl text-burgundy">{i + 1}</p>
            <h2 className="mt-2 font-sans text-base font-semibold text-charcoal">{title}</h2>
            <p className="mt-1 text-sm text-muted">{body}</p>
          </li>
        ))}
      </ol>

      <ul className="mt-10 divide-y divide-flour border-b border-flour">
        {(data?.services ?? []).map((s) => (
          <li key={s.slug} className="flex flex-col gap-3 py-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl">{s.name}</h2>
              <p className="mt-1 max-w-xl text-muted">{s.description}</p>
            </div>
            <Link href={`/services/request?service=${s.slug}`} className="btn btn-primary shrink-0">Request a quote</Link>
          </li>
        ))}
      </ul>
      {data && <p className="mt-6 text-sm text-muted">We need at least {data.leadDays} days’ notice. For anything sooner, message us on WhatsApp.</p>}
    </>
  );
}
