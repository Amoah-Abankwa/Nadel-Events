import type { Metadata } from 'next';
import { PolicyPage } from '@/components/support/PolicyPage';
import { serverGet } from '@/lib/api/server';
import type { Category } from '@/lib/types';
import { flattenAll } from '@/lib/departments';

export const metadata: Metadata = { title: 'Returns and refunds' };

// Periods come from category settings, so this page stays correct when the owner changes them.
// Have the full wording reviewed before launch (SRS 12).
export default async function ReturnsPage() {
  const categories = flattenAll(await serverGet<Category[]>('/categories', 300).catch(() => [] as Category[]));

  return (
    <PolicyPage title="Returns and refunds">
      <p>
        How long you have to return an item depends on what it is. Working days are Monday to Friday, excluding public holidays. The
        period starts the day after you pick up your order or it is delivered.
      </p>
      {categories.length > 0 && (
        <ul className="divide-y divide-flour border-y border-flour">
          {categories.map((c) => (
            <li key={c.id} className="flex justify-between gap-4 py-3">
              <span>{c.name}</span>
              <span className="font-semibold">
                {c.returnWindowDays === 0 ? 'Not returnable' : `${c.returnWindowDays} working ${c.returnWindowDays === 1 ? 'day' : 'days'}`}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p>
        Cakes and pastries are made fresh and can’t be returned or refunded. If something is wrong with your cake, message us on WhatsApp
        with a photo and your order number as soon as you receive it.
      </p>
      <p>Some individual products have their own period; their product page says so. Your account shows the exact deadline for each item on every completed order.</p>
      <p>To start a return, message us on WhatsApp with your order number.</p>
    </PolicyPage>
  );
}
