'use client';

import { useState } from 'react';
import { SaveStatus, Table } from '@/components/admin/ui';
import { MONEY_RE, adminApi, type AdminProduct, type AdminVariant } from '@/lib/api/admin';
import { formatMoney } from '@/lib/format';
import { useSaver } from '@/hooks/use-load';

/** Options (sizes, colours…) with stock. Stock only changes through recorded adjustments. */
export function VariantsEditor({ product, onChange }: { product: AdminProduct; onChange: () => void }) {
  return (
    <section className="panel p-5" aria-labelledby="variants-h">
      <h2 id="variants-h" className="text-xl">Options and stock</h2>
      <p className="mt-1 text-sm text-muted">“Reserved” is stock held for customers who are paying right now.</p>
      <div className="mt-4">
        <Table caption="Product options">
          <thead>
            <tr><th>Option</th><th>SKU</th><th>Price</th><th className="text-right">In stock</th><th className="text-right">Reserved</th><th>Adjust stock</th><th /></tr>
          </thead>
          <tbody>
            {product.variants.map((v) => <VariantRow key={v.id} v={v} basePrice={product.basePrice} onChange={onChange} />)}
          </tbody>
        </Table>
      </div>
      <AddVariant productId={product.id} onAdded={onChange} />
    </section>
  );
}

function VariantRow({ v, basePrice, onChange }: { v: AdminVariant; basePrice: string; onChange: () => void }) {
  const saver = useSaver();
  const [name, setName] = useState(v.name);
  const [price, setPrice] = useState(v.price ?? '');
  const [delta, setDelta] = useState('');
  const [note, setNote] = useState('');
  const dirty = name !== v.name || price !== (v.price ?? '');
  const priceOk = price === '' || MONEY_RE.test(price);
  const deltaN = Number(delta);
  const deltaOk = /^-?\d+$/.test(delta) && deltaN !== 0;

  return (
    <tr className={v.isActive ? '' : 'opacity-60'}>
      <td><input aria-label="Option name" className="field min-w-28" value={name} onChange={(e) => setName(e.target.value)} /></td>
      <td className="text-xs text-muted">{v.sku}</td>
      <td>
        <input aria-label={`Price for ${v.name}`} className="field w-28" inputMode="decimal" placeholder={formatMoney(basePrice)} value={price} aria-invalid={!priceOk} onChange={(e) => setPrice(e.target.value.trim())} />
      </td>
      <td className="text-right">{v.trackStock ? v.stockOnHand : '—'}</td>
      <td className="text-right">{v.trackStock ? v.stockReserved : '—'}</td>
      <td>
        {v.trackStock && (
          <div className="flex gap-1">
            <input aria-label={`Stock change for ${v.name}, e.g. 10 or -2`} className="field w-20" inputMode="numeric" placeholder="+10" value={delta} onChange={(e) => setDelta(e.target.value.trim())} />
            <input aria-label="Reason" className="field w-32" placeholder="Reason" value={note} onChange={(e) => setNote(e.target.value)} />
            <button type="button" className="btn btn-secondary" disabled={!deltaOk || saver.saving}
              onClick={async () => { if (await saver.run(() => adminApi.adjustStock(v.id, deltaN, note || undefined), 'Stock updated')) { setDelta(''); setNote(''); onChange(); } }}>
              Apply
            </button>
          </div>
        )}
      </td>
      <td className="whitespace-nowrap">
        <div className="flex items-center gap-2">
          {dirty && (
            <button type="button" className="btn btn-primary" disabled={!priceOk || saver.saving}
              onClick={async () => { if (await saver.run(() => adminApi.updateVariant(v.id, { name, price: price || null }))) onChange(); }}>
              Save
            </button>
          )}
          <button type="button" className="text-sm underline" disabled={saver.saving}
            onClick={async () => { if (await saver.run(() => adminApi.updateVariant(v.id, { isActive: !v.isActive }))) onChange(); }}>
            {v.isActive ? 'Hide' : 'Show'}
          </button>
          <SaveStatus status={saver.status} message={saver.message} />
        </div>
      </td>
    </tr>
  );
}

function AddVariant({ productId, onAdded }: { productId: string; onAdded: () => void }) {
  const saver = useSaver();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: '', sku: '', price: '', stock: '0' });
  const ok = f.name.trim() && f.sku.trim().length >= 2 && (f.price === '' || MONEY_RE.test(f.price)) && /^\d+$/.test(f.stock);

  if (!open) return <button type="button" className="btn btn-secondary mt-4" onClick={() => setOpen(true)}>Add an option</button>;
  return (
    <form
      className="mt-4 flex flex-wrap items-end gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await saver.run(() => adminApi.addVariant(productId, { name: f.name.trim(), sku: f.sku.trim(), price: f.price || undefined, stockOnHand: Number(f.stock) }), 'Option added');
        if (r) { setF({ name: '', sku: '', price: '', stock: '0' }); setOpen(false); onAdded(); }
      }}
    >
      <div><label htmlFor="nv-name" className="label">Option name</label><input id="nv-name" className="field w-40" placeholder="e.g. 10-inch" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
      <div><label htmlFor="nv-sku" className="label">SKU</label><input id="nv-sku" className="field w-36" value={f.sku} onChange={(e) => setF({ ...f, sku: e.target.value.toUpperCase() })} /></div>
      <div><label htmlFor="nv-price" className="label">Price (empty = same)</label><input id="nv-price" className="field w-28" inputMode="decimal" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value.trim() })} /></div>
      <div><label htmlFor="nv-stock" className="label">Starting stock</label><input id="nv-stock" className="field w-24" inputMode="numeric" value={f.stock} onChange={(e) => setF({ ...f, stock: e.target.value.trim() })} /></div>
      <button type="submit" className="btn btn-primary" disabled={!ok || saver.saving}>Add option</button>
      <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
      <SaveStatus status={saver.status} message={saver.message} />
    </form>
  );
}
