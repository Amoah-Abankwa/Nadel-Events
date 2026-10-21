import { formatMoney } from '@/lib/format';

export function PriceDisplay({ price, compareAt, from = false, className = '' }: { price: string; compareAt?: string | null; from?: boolean; className?: string }) {
  const onSale = compareAt && Number(compareAt) > Number(price);
  return (
    <p className={`flex items-baseline gap-2 ${className}`}>
      <span className="font-semibold text-charcoal">
        {from && <span className="font-normal text-muted">From </span>}
        {formatMoney(price)}
      </span>
      {onSale && (
        <s className="text-sm text-muted">
          <span className="sr-only">Was </span>
          {formatMoney(compareAt!)}
        </s>
      )}
    </p>
  );
}
