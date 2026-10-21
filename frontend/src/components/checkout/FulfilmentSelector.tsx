'use client';

import { siteConfig } from '@/lib/config';
import type { FulfilmentType } from '@/lib/types';

export function FulfilmentSelector({ value, onChange, deliveryDisabledReason }: { value: FulfilmentType; onChange: (v: FulfilmentType) => void; deliveryDisabledReason?: string }) {
  const option = (v: FulfilmentType, title: string, detail: string, disabled = false) => (
    <label
      className={`flex cursor-pointer gap-3 rounded-md border p-4 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-burgundy ${
        value === v ? 'border-burgundy bg-paper' : 'border-crust'
      } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
    >
      <input type="radio" name="fulfilment" value={v} checked={value === v} onChange={() => onChange(v)} disabled={disabled} className="mt-1 accent-burgundy" />
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm text-muted">{detail}</span>
      </span>
    </label>
  );

  return (
    <fieldset className="grid gap-3 sm:grid-cols-2">
      <legend className="label mb-3">How would you like to get your order?</legend>
      {option('PICKUP', 'Pick up in store', [siteConfig.pickupAddress, siteConfig.pickupHours].filter(Boolean).join('. ') || 'No delivery fee')}
      {option('DELIVERY', 'Delivery', deliveryDisabledReason ?? 'Nationwide. Fee depends on your region', Boolean(deliveryDisabledReason))}
    </fieldset>
  );
}
