'use client';

import { useState } from 'react';
import { Field, PageHeader, SaveStatus, Table, Toggle } from '@/components/admin/ui';
import { ErrorState } from '@/components/support/ErrorState';
import { Skeleton } from '@/components/support/Skeleton';
import { adminApi, fractionToPercent, percentToFraction, type AdminTaxRate, type StoreSettings } from '@/lib/api/admin';
import { formatMoney } from '@/lib/format';
import { useLoad, useSaver } from '@/hooks/use-load';

export default function SettingsPage() {
  const settings = useLoad(() => adminApi.settings(), []);
  const taxes = useLoad(() => adminApi.taxRates(), []);

  if (settings.error) return <ErrorState message={settings.error.message} onRetry={settings.reload} />;
  if (!settings.data || !taxes.data) return <Skeleton className="h-96" />;

  return (
    <>
      <PageHeader title="Tax and settings" description="Changes take effect for new orders within about 30 seconds. Existing orders keep the amounts and rules they were placed with." />
      <div className="space-y-10">
        <TaxSection rates={taxes.data} pricesIncludeTax={settings.data.pricesIncludeTax} onChange={taxes.reload} />
        <StoreSettingsForm key={settings.data.updatedAt} s={settings.data} onSaved={settings.reload} />
      </div>
    </>
  );
}

// ---------------- Tax ----------------

function TaxSection({ rates, pricesIncludeTax, onChange }: { rates: AdminTaxRate[]; pricesIncludeTax: boolean; onChange: () => void }) {
  const active = rates.filter((r) => r.isActive);
  const sampleGoods = 100;
  const sampleDelivery = 50;
  const sampleTax = active.reduce((sum, r) => sum + (sampleGoods + (r.appliesToDelivery ? sampleDelivery : 0)) * Number(r.rate), 0);

  return (
    <section aria-labelledby="tax-h">
      <h2 id="tax-h" className="text-2xl">Tax</h2>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        Shelf prices {pricesIncludeTax ? 'include' : 'exclude'} tax, so each active tax below is {pricesIncludeTax ? 'shown as included' : 'added at checkout'} and listed on the receipt.
        Each tax is calculated on the order after discounts. Confirm the current names and rates with your accountant.
      </p>
      <div className="mt-4">
        <Table caption="Tax rates">
          <thead><tr><th>Name on receipt</th><th>Rate (%)</th><th>Also on delivery fee</th><th>Order</th><th>Active</th><th /></tr></thead>
          <tbody>
            {rates.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-muted">No taxes yet. Add one below.</td></tr>}
            {rates.map((r) => <TaxRow key={r.id} rate={r} onSaved={onChange} />)}
            <NewTaxRow count={rates.length} onAdded={onChange} />
          </tbody>
        </Table>
      </div>
      <p className="mt-3 text-sm" role="status">
        {active.length === 0
          ? 'No tax is being charged right now.'
          : `Example: on ${formatMoney(sampleGoods)} of goods with ${formatMoney(sampleDelivery)} delivery, tax is ${formatMoney(sampleTax)} (${active.map((r) => `${r.name} ${fractionToPercent(r.rate)}%`).join(', ')}).`}
      </p>
    </section>
  );
}

type TaxDraft = { name: string; percent: string; appliesToDelivery: boolean; sortOrder: string; isActive: boolean };

function TaxInputs({ d, set }: { d: TaxDraft; set: (d: TaxDraft) => void }) {
  const pctOk = d.percent === '' || percentToFraction(d.percent) !== null;
  return (
    <>
      <td><input aria-label="Tax name" className="field min-w-36" placeholder="e.g. VAT" value={d.name} onChange={(e) => set({ ...d, name: e.target.value })} /></td>
      <td><input aria-label="Rate in percent" className="field w-24" inputMode="decimal" placeholder="15" value={d.percent} aria-invalid={!pctOk} onChange={(e) => set({ ...d, percent: e.target.value.trim() })} /></td>
      <td><input aria-label="Also applies to delivery fee" type="checkbox" className="size-4 accent-burgundy" checked={d.appliesToDelivery} onChange={(e) => set({ ...d, appliesToDelivery: e.target.checked })} /></td>
      <td><input aria-label="Order on receipt" className="field w-16" inputMode="numeric" value={d.sortOrder} onChange={(e) => set({ ...d, sortOrder: e.target.value.trim() })} /></td>
      <td><input aria-label="Active" type="checkbox" className="size-4 accent-burgundy" checked={d.isActive} onChange={(e) => set({ ...d, isActive: e.target.checked })} /></td>
    </>
  );
}

const taxBody = (d: TaxDraft) => ({ name: d.name.trim(), rate: percentToFraction(d.percent)!, appliesToDelivery: d.appliesToDelivery, sortOrder: Number(d.sortOrder) || 0, isActive: d.isActive });
const taxValid = (d: TaxDraft) => d.name.trim().length >= 2 && percentToFraction(d.percent) !== null;

function TaxRow({ rate, onSaved }: { rate: AdminTaxRate; onSaved: () => void }) {
  const saver = useSaver();
  const initial: TaxDraft = { name: rate.name, percent: fractionToPercent(rate.rate), appliesToDelivery: rate.appliesToDelivery, sortOrder: String(rate.sortOrder), isActive: rate.isActive };
  const [d, setD] = useState(initial);
  const dirty = JSON.stringify(d) !== JSON.stringify(initial);
  return (
    <tr className={d.isActive ? '' : 'opacity-60'}>
      <TaxInputs d={d} set={setD} />
      <td className="whitespace-nowrap">
        <button type="button" className="btn btn-primary" disabled={!dirty || !taxValid(d) || saver.saving}
          onClick={async () => { if (await saver.run(() => adminApi.updateTaxRate(rate.id, taxBody(d)))) onSaved(); }}>
          Save
        </button>{' '}
        <SaveStatus status={saver.status} message={saver.message} />
      </td>
    </tr>
  );
}

function NewTaxRow({ count, onAdded }: { count: number; onAdded: () => void }) {
  const saver = useSaver();
  const empty: TaxDraft = { name: '', percent: '', appliesToDelivery: false, sortOrder: String(count + 1), isActive: true };
  const [d, setD] = useState(empty);
  return (
    <tr className="bg-cream/60">
      <TaxInputs d={d} set={setD} />
      <td className="whitespace-nowrap">
        <button type="button" className="btn btn-secondary" disabled={!taxValid(d) || saver.saving}
          onClick={async () => { if (await saver.run(() => adminApi.createTaxRate(taxBody(d)), 'Tax added')) { setD({ ...empty, sortOrder: String(count + 2) }); onAdded(); } }}>
          Add tax
        </button>{' '}
        <SaveStatus status={saver.status} message={saver.message} />
      </td>
    </tr>
  );
}

// ---------------- Store settings ----------------

function StoreSettingsForm({ s, onSaved }: { s: StoreSettings; onSaved: () => void }) {
  const saver = useSaver();
  const [windowMin, setWindowMin] = useState(String(s.paymentWindowMinutes));
  const [returnDays, setReturnDays] = useState(String(s.returnWindowWorkingDays));
  const [inclusive, setInclusive] = useState(s.pricesIncludeTax);
  const [leadDays, setLeadDays] = useState(String(s.serviceLeadDays));
  const [reviewsBuyersOnly, setReviewsBuyersOnly] = useState(s.reviewsRequirePurchase);
  const [holidays, setHolidays] = useState<string[]>([...s.publicHolidays].sort());
  const [newHoliday, setNewHoliday] = useState('');

  const windowOk = /^\d+$/.test(windowMin) && Number(windowMin) >= 5 && Number(windowMin) <= 120;
  const daysOk = /^\d+$/.test(returnDays) && Number(returnDays) <= 60;
  const leadOk = /^\d+$/.test(leadDays) && Number(leadDays) <= 90;

  return (
    <form
      aria-labelledby="store-h"
      className="space-y-6"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!windowOk || !daysOk || !leadOk) return;
        const r = await saver.run(() => adminApi.updateSettings({ paymentWindowMinutes: Number(windowMin), returnWindowWorkingDays: Number(returnDays), serviceLeadDays: Number(leadDays), reviewsRequirePurchase: reviewsBuyersOnly, pricesIncludeTax: inclusive, publicHolidays: holidays }), 'Settings saved');
        if (r) onSaved();
      }}
    >
      <h2 id="store-h" className="text-2xl">Checkout, returns and requests</h2>
      <div className="panel grid gap-6 p-5 sm:grid-cols-2">
        <Field id="window" label="Payment window (minutes)" hint="How long items are held while a customer pays. After this, unpaid orders are released. 5–120." error={windowOk ? undefined : 'Enter 5–120 minutes.'}>
          <input id="window" className="field w-32" inputMode="numeric" value={windowMin} onChange={(e) => setWindowMin(e.target.value.trim())} />
        </Field>
        <Field id="returnDays" label="Default returns period (working days)" hint="Used only when a product and its categories don’t set their own. Category periods are on the Categories page." error={daysOk ? undefined : 'Enter 0–60.'}>
          <input id="returnDays" className="field w-32" inputMode="numeric" value={returnDays} onChange={(e) => setReturnDays(e.target.value.trim())} />
        </Field>
        <Field id="leadDays" label="Notice needed for cake and event requests (days)" hint="Customers can’t pick an event date sooner than this. 0–90." error={leadOk ? undefined : 'Enter 0–90.'}>
          <input id="leadDays" className="field w-32" inputMode="numeric" value={leadDays} onChange={(e) => setLeadDays(e.target.value.trim())} />
        </Field>
        <div className="sm:col-span-2">
          <Toggle id="buyersOnly" label="Only customers who bought a product can review it" checked={reviewsBuyersOnly} onChange={setReviewsBuyersOnly} />
          <p className="text-xs text-muted">Every review is checked before it appears either way. Buyers’ reviews are marked “verified buyer”.</p>
        </div>
        <div className="sm:col-span-2">
          <Toggle id="inclusive" label="Shelf prices already include tax" checked={inclusive} onChange={setInclusive} />
          <p className="text-xs text-muted">Off: tax is added on top at checkout (your current setup). Only change this if you re-price every product.</p>
        </div>
      </div>

      <div className="panel p-5">
        <h3 className="font-sans text-base font-semibold text-charcoal">Public holidays</h3>
        <p className="mt-1 text-sm text-muted">These days don’t count as working days for returns. Add each year’s holidays, including any announced at short notice.</p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {holidays.length === 0 && <li className="text-sm text-muted">None added.</li>}
          {holidays.map((h) => (
            <li key={h} className="inline-flex items-center gap-2 rounded-sm border border-crust bg-paper px-2 py-1 text-sm">
              {new Date(`${h}T12:00:00Z`).toLocaleDateString('en-GH', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
              <button type="button" className="text-danger" aria-label={`Remove ${h}`} onClick={() => setHolidays(holidays.filter((x) => x !== h))}>×</button>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-end gap-2">
          <div>
            <label htmlFor="holiday" className="label">Add a date</label>
            <input id="holiday" type="date" className="field" value={newHoliday} onChange={(e) => setNewHoliday(e.target.value)} />
          </div>
          <button type="button" className="btn btn-secondary" disabled={!newHoliday || holidays.includes(newHoliday)}
            onClick={() => { setHolidays([...holidays, newHoliday].sort()); setNewHoliday(''); }}>
            Add
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button type="submit" className="btn btn-primary" disabled={saver.saving || !windowOk || !daysOk || !leadOk}>Save settings</button>
        <SaveStatus status={saver.status} message={saver.message} />
      </div>
    </form>
  );
}
