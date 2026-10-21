'use client';

import { useState } from 'react';
import { PageHeader, SaveStatus, Table } from '@/components/admin/ui';
import { ErrorState } from '@/components/support/ErrorState';
import { Skeleton } from '@/components/support/Skeleton';
import { MONEY_RE, adminApi, type AdminZone } from '@/lib/api/admin';
import { GHANA_REGIONS } from '@/lib/ghana';
import { useLoad, useSaver } from '@/hooks/use-load';

type Draft = { name: string; region: string; areas: string; fee: string; minimumOrder: string; freeDeliveryThreshold: string; leadTime: string; isActive: boolean };

const toDraft = (z?: AdminZone, region = ''): Draft => ({
  name: z?.name ?? region,
  region: z?.region ?? region,
  areas: z?.areas.join(', ') ?? '',
  fee: z?.fee ?? '',
  minimumOrder: z?.minimumOrder ?? '',
  freeDeliveryThreshold: z?.freeDeliveryThreshold ?? '',
  leadTime: z?.leadTime ?? '',
  isActive: z?.isActive ?? true,
});

const toBody = (d: Draft, sortOrder: number) => ({
  name: d.name.trim() || d.region,
  region: d.region,
  areas: d.areas.split(',').map((a) => a.trim()).filter(Boolean),
  fee: d.fee,
  minimumOrder: d.minimumOrder || undefined,
  freeDeliveryThreshold: d.freeDeliveryThreshold || undefined,
  leadTime: d.leadTime.trim() || undefined,
  isActive: d.isActive,
  sortOrder,
});

const valid = (d: Draft) => d.region && MONEY_RE.test(d.fee) && (!d.minimumOrder || MONEY_RE.test(d.minimumOrder)) && (!d.freeDeliveryThreshold || MONEY_RE.test(d.freeDeliveryThreshold));

export default function DeliveryPage() {
  const zones = useLoad(() => adminApi.zones(), []);
  if (zones.error) return <ErrorState message={zones.error.message} onRetry={zones.reload} />;
  if (!zones.data) return <Skeleton className="h-64" />;
  const list = zones.data;
  const uncovered = GHANA_REGIONS.filter((r) => !list.some((z) => z.region === r && z.areas.length === 0 && z.isActive));

  return (
    <>
      <PageHeader
        title="Delivery fees"
        description="Each region has a rate that covers the whole region. Add a town-specific rate inside a region when some towns cost more or less; customers in those towns get that rate instead."
      />
      {uncovered.length > 0 && (
        <p role="status" className="mb-4 rounded-md border border-crust bg-paper p-3 text-sm">
          Customers can’t choose delivery to: {uncovered.join(', ')}. Add a region-wide rate to open delivery there.
        </p>
      )}
      <Table caption="Delivery rates">
        <thead>
          <tr><th>Region</th><th>Towns (empty = whole region)</th><th>Fee</th><th>Minimum order</th><th>Free from</th><th>Delivery time</th><th>On</th><th /></tr>
        </thead>
        <tbody>
          {[...list].sort((a, b) => a.region.localeCompare(b.region) || a.areas.length - b.areas.length).map((z) => (
            <ZoneRow key={z.id} zone={z} onSaved={zones.reload} />
          ))}
        </tbody>
      </Table>
      <AddZone count={list.length} onAdded={zones.reload} />
    </>
  );
}

function ZoneInputs({ d, set, regionLocked }: { d: Draft; set: (d: Draft) => void; regionLocked?: boolean }) {
  return (
    <>
      <td>
        {regionLocked ? <span className="font-semibold">{d.region}</span> : (
          <select aria-label="Region" className="field w-40" value={d.region} onChange={(e) => set({ ...d, region: e.target.value, name: d.name || e.target.value })}>
            <option value="">Region</option>
            {GHANA_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        )}
      </td>
      <td><input aria-label="Towns, comma separated" className="field min-w-44" placeholder="Whole region" value={d.areas} onChange={(e) => set({ ...d, areas: e.target.value })} /></td>
      <td><input aria-label="Fee" className="field w-24" inputMode="decimal" value={d.fee} aria-invalid={!!d.fee && !MONEY_RE.test(d.fee)} onChange={(e) => set({ ...d, fee: e.target.value.trim() })} /></td>
      <td><input aria-label="Minimum order" className="field w-24" inputMode="decimal" placeholder="None" value={d.minimumOrder} onChange={(e) => set({ ...d, minimumOrder: e.target.value.trim() })} /></td>
      <td><input aria-label="Free delivery from" className="field w-24" inputMode="decimal" placeholder="Never" value={d.freeDeliveryThreshold} onChange={(e) => set({ ...d, freeDeliveryThreshold: e.target.value.trim() })} /></td>
      <td><input aria-label="Delivery time" className="field w-36" placeholder="e.g. 2–3 working days" value={d.leadTime} onChange={(e) => set({ ...d, leadTime: e.target.value })} /></td>
      <td><input aria-label="Active" type="checkbox" className="size-4 accent-burgundy" checked={d.isActive} onChange={(e) => set({ ...d, isActive: e.target.checked })} /></td>
    </>
  );
}

function ZoneRow({ zone, onSaved }: { zone: AdminZone; onSaved: () => void }) {
  const saver = useSaver();
  const [d, setD] = useState(() => toDraft(zone));
  const dirty = JSON.stringify(d) !== JSON.stringify(toDraft(zone));
  return (
    <tr className={d.isActive ? '' : 'opacity-60'}>
      <ZoneInputs d={d} set={setD} regionLocked />
      <td className="whitespace-nowrap">
        <button type="button" className="btn btn-primary" disabled={!dirty || !valid(d) || saver.saving}
          onClick={async () => { if (await saver.run(() => adminApi.updateZone(zone.id, toBody(d, zone.sortOrder)))) onSaved(); }}>
          Save
        </button>{' '}
        <SaveStatus status={saver.status} message={saver.message} />
      </td>
    </tr>
  );
}

function AddZone({ count, onAdded }: { count: number; onAdded: () => void }) {
  const saver = useSaver();
  const [d, setD] = useState(() => toDraft());
  return (
    <section aria-labelledby="add-zone" className="mt-6">
      <h2 id="add-zone" className="mb-3 text-xl">Add a rate</h2>
      <Table caption="New delivery rate">
        <tbody>
          <tr>
            <ZoneInputs d={d} set={setD} />
            <td className="whitespace-nowrap">
              <button type="button" className="btn btn-primary" disabled={!valid(d) || saver.saving}
                onClick={async () => { if (await saver.run(() => adminApi.createZone(toBody(d, count + 1)), 'Rate added')) { setD(toDraft()); onAdded(); } }}>
                Add
              </button>{' '}
              <SaveStatus status={saver.status} message={saver.message} />
            </td>
          </tr>
        </tbody>
      </Table>
    </section>
  );
}
