import { formatMoney } from '@/lib/format';
import type { FulfilmentType, Quote } from '@/lib/types';
import type { CartItem } from '@/stores/cart-store';

export function OrderSummary({ items, quote, loading, fulfilment }: { items: CartItem[]; quote: Quote | null; loading: boolean; fulfilment: FulfilmentType }) {
  const m = (v: string) => formatMoney(v, quote?.currency);
  const row = (label: string, value: string | null, strong = false) => (
    <div className={`flex justify-between gap-3 ${strong ? 'border-t border-flour pt-3 text-base font-semibold' : 'text-sm'}`}>
      <dt>{label}</dt>
      <dd className="text-right">{value ?? '—'}</dd>
    </div>
  );
  const taxLines = quote?.taxLines.filter((t) => Number(t.amount) > 0) ?? [];

  return (
    <aside className="panel h-fit p-6" aria-labelledby="order-summary" aria-busy={loading}>
      <h2 id="order-summary" className="text-xl">Your order</h2>
      <ul className="mt-4 space-y-2 text-sm">
        {items.map((i) => (
          <li key={i.variantId}>
            {i.name}{i.variantName && i.variantName !== 'Standard' ? ` (${i.variantName})` : ''} × {i.quantity}
          </li>
        ))}
      </ul>
      <dl className="mt-5 space-y-2">
        {row('Subtotal', quote && m(quote.subtotal))}
        {quote && Number(quote.discountTotal) > 0 && row(`Discount${quote.couponCode ? ` (${quote.couponCode})` : ''}`, `−${m(quote.discountTotal)}`)}
        {row(
          fulfilment === 'PICKUP' ? 'Pickup' : `Delivery${quote?.deliveryZone ? `, ${quote.deliveryZone}` : ''}`,
          quote ? (quote.freeDeliveryApplied ? 'Free' : m(quote.deliveryFee)) : null,
        )}
        {quote && !quote.pricesIncludeTax && taxLines.map((t) => row(`${t.name} (${t.ratePercent}%)`, m(t.amount)))}
        {row('Total', quote && m(quote.total), true)}
      </dl>
      {quote?.pricesIncludeTax && taxLines.length > 0 && (
        <p className="mt-2 text-sm text-muted">
          Includes {taxLines.map((t) => `${t.name} ${m(t.amount)}`).join(' and ')}.
        </p>
      )}
      {fulfilment === 'DELIVERY' && quote?.deliveryLeadTime && <p className="mt-3 text-sm">Delivery time: {quote.deliveryLeadTime}.</p>}
      {quote?.amountToFreeDelivery && <p className="mt-2 text-sm text-muted">Add {m(quote.amountToFreeDelivery)} more for free delivery.</p>}
      {loading && <p className="mt-3 text-sm text-muted" role="status">Updating total…</p>}
    </aside>
  );
}
