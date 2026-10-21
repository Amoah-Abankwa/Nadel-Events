'use client';

import { useState } from 'react';
import { GHANA_REGIONS } from '@/lib/ghana';
import type { Address } from '@/lib/types';

export const EMPTY_ADDRESS: Address = { recipientName: '', phone: '', addressLine: '', region: '', area: '', city: '', deliveryInstructions: '' };

/** Plain address form for the account page (checkout uses AddressFields with live delivery rates). */
export function AddressEditor({ initial, submitLabel, onSubmit, onCancel, errors = {} }: { initial: Address; submitLabel: string; onSubmit: (a: Address) => Promise<void>; onCancel?: () => void; errors?: Record<string, string> }) {
  const [a, setA] = useState(initial);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof Address) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setA({ ...a, [k]: e.target.value });
  const input = (k: keyof Address, label: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={`ae-${k}`} className="label">{label}</label>
      <input id={`ae-${k}`} className="field" value={a[k] ?? ''} onChange={set(k)} aria-invalid={Boolean(errors[k])} {...extra} />
      {errors[k] && <p className="mt-1 text-xs text-danger">{errors[k]}</p>}
    </div>
  );
  return (
    <form className="grid gap-4 sm:grid-cols-2" onSubmit={async (e) => { e.preventDefault(); setBusy(true); await onSubmit(a); setBusy(false); }}>
      {input('recipientName', 'Recipient name', { autoComplete: 'name' })}
      {input('phone', 'Phone', { autoComplete: 'tel', type: 'tel' })}
      <div>
        <label htmlFor="ae-region" className="label">Region</label>
        <select id="ae-region" className="field" value={a.region} onChange={set('region')} aria-invalid={Boolean(errors.region)}>
          <option value="">Choose a region</option>
          {GHANA_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      {input('area', 'Town or area')}
      {input('city', 'City or district')}
      {input('addressLine', 'Street, house number or landmark', { autoComplete: 'street-address' })}
      <div className="sm:col-span-2">
        <label htmlFor="ae-notes" className="label">Directions for the rider (optional)</label>
        <textarea id="ae-notes" className="field min-h-16" maxLength={300} value={a.deliveryInstructions ?? ''} onChange={set('deliveryInstructions')} />
      </div>
      <div className="flex gap-3 sm:col-span-2">
        <button className="btn btn-primary" disabled={busy}>{submitLabel}</button>
        {onCancel && <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}
