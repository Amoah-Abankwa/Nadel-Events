'use client';

import { useMemo } from 'react';
import { GHANA_REGIONS } from '@/lib/ghana';
import { formatMoney } from '@/lib/format';
import type { Address, DeliveryZone } from '@/lib/types';

interface Props {
  value: Address;
  onChange: (a: Address) => void;
  zones: DeliveryZone[];
  errors: Record<string, string>;
}

/** Nationwide delivery: region decides the base rate; some towns inside a region have their own rate. */
export function AddressFields({ value, onChange, zones, errors }: Props) {
  const set = (k: keyof Address) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => onChange({ ...value, [k]: e.target.value });
  const err = (k: string) => errors[`address.${k}`] ?? (k === 'region' ? errors.deliveryRegion : undefined);

  const served = useMemo(() => new Set(zones.map((z) => z.region)), [zones]);
  const regionZones = zones.filter((z) => z.region === value.region);
  const regionDefault = regionZones.find((z) => z.areas.length === 0);
  const knownAreas = regionZones.flatMap((z) => z.areas);

  const field = (k: keyof Address, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={`addr-${k}`} className="label">{label}</label>
      <input id={`addr-${k}`} className="field" value={value[k] ?? ''} onChange={set(k)} aria-invalid={Boolean(err(k))} aria-describedby={err(k) ? `addr-${k}-err` : undefined} required {...props} />
      {err(k) && <p id={`addr-${k}-err`} className="mt-1 text-sm text-danger">{err(k)}</p>}
    </div>
  );

  return (
    <fieldset className="grid gap-4 sm:grid-cols-2">
      <legend className="label mb-3">Delivery address</legend>
      {field('recipientName', 'Recipient name', { autoComplete: 'name' })}
      {field('phone', 'Recipient phone', { autoComplete: 'tel', inputMode: 'tel' })}

      <div>
        <label htmlFor="addr-region" className="label">Region</label>
        <select id="addr-region" className="field" value={value.region} onChange={(e) => onChange({ ...value, region: e.target.value, area: '' })} required aria-invalid={Boolean(err('region'))}>
          <option value="">Choose your region</option>
          {GHANA_REGIONS.map((r) => (
            <option key={r} value={r} disabled={!served.has(r)}>{served.has(r) ? r : `${r} (not available)`}</option>
          ))}
        </select>
        {regionDefault && (
          <p className="mt-1 text-sm text-muted">
            From {formatMoney(regionDefault.fee)}{regionDefault.leadTime ? `, ${regionDefault.leadTime}` : ''}.
          </p>
        )}
        {err('region') && <p className="mt-1 text-sm text-danger">{err('region')}</p>}
      </div>

      <div>
        <label htmlFor="addr-area" className="label">Town or area</label>
        <input id="addr-area" className="field" list="addr-area-options" value={value.area} onChange={set('area')} autoComplete="address-level3" required aria-invalid={Boolean(err('area'))} />
        <datalist id="addr-area-options">
          {knownAreas.map((a) => <option key={a} value={a} />)}
        </datalist>
      </div>

      {field('city', 'City or district', { autoComplete: 'address-level2' })}
      {field('addressLine', 'Street, house number or landmark', { autoComplete: 'street-address' })}

      <div className="sm:col-span-2">
        <label htmlFor="addr-notes" className="label">Directions for the rider (optional)</label>
        <textarea id="addr-notes" className="field min-h-20" value={value.deliveryInstructions ?? ''} onChange={set('deliveryInstructions')} maxLength={300} />
      </div>
    </fieldset>
  );
}
