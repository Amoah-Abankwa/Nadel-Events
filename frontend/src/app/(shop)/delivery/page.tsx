import type { Metadata } from 'next';
import { PolicyPage } from '@/components/support/PolicyPage';
import { serverGet } from '@/lib/api/server';
import { siteConfig } from '@/lib/config';
import { formatMoney } from '@/lib/format';
import { GHANA_REGIONS } from '@/lib/ghana';
import type { DeliveryZone } from '@/lib/types';

export const metadata: Metadata = { title: 'Delivery and pickup' };

export default async function DeliveryPage() {
  const zones = await serverGet<DeliveryZone[]>('/delivery/zones', 300).catch(() => [] as DeliveryZone[]);
  const byRegion = GHANA_REGIONS.map((region) => ({
    region,
    base: zones.find((z) => z.region === region && z.areas.length === 0),
    special: zones.filter((z) => z.region === region && z.areas.length > 0),
  })).filter((r) => r.base || r.special.length);

  return (
    <PolicyPage title="Delivery and pickup">
      <p>We deliver across Ghana. The fee depends on your region, and some towns have their own rate. You always see the exact fee before you pay.</p>
      {siteConfig.pickupAddress && <p>Pickup is free from {siteConfig.pickupAddress}{siteConfig.pickupHours ? `, ${siteConfig.pickupHours}` : ''}.</p>}
      {byRegion.length > 0 && (
        <div className="overflow-x-auto">
          <table className="mt-4 w-full text-left text-sm">
            <caption className="sr-only">Delivery fees by region</caption>
            <thead>
              <tr className="border-b border-crust"><th className="py-2 pr-4">Region</th><th className="py-2 pr-4">Fee</th><th className="py-2">Usually arrives</th></tr>
            </thead>
            <tbody>
              {byRegion.map((r) => (
                <tr key={r.region} className="border-b border-flour align-top">
                  <td className="py-2 pr-4">{r.region}</td>
                  <td className="py-2 pr-4">
                    {r.base ? formatMoney(r.base.fee) : '—'}
                    {r.special.map((z) => (
                      <span key={z.zone} className="block text-muted">{z.areas.join(', ')}: {formatMoney(z.fee)}</span>
                    ))}
                  </td>
                  <td className="py-2">{r.base?.leadTime ?? r.special[0]?.leadTime ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p>Cakes and some fresh items are pickup only, so they arrive in good shape. Their product pages say so.</p>
    </PolicyPage>
  );
}
