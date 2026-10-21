'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Field, SaveStatus, Toggle } from '@/components/admin/ui';
import { MONEY_RE, adminApi, slugify, type AdminProduct } from '@/lib/api/admin';
import { useLoad, useSaver } from '@/hooks/use-load';
import { api } from '@/lib/api/client';
import { ImageManager } from './ImageManager';
import { describeReturns, useCategoryOptions } from './useCategoryOptions';

type Draft = {
  name: string;
  slug: string;
  categoryId: string;
  brand: string;
  description: string;
  specs: { group: string; name: string; value: string }[];
  basePrice: string;
  compareAtPrice: string;
  status: AdminProduct['status'];
  isFeatured: boolean;
  pickupOnly: boolean;
  returnOverride: string; // '' = use category
  images: string[];
  // new products only
  sku: string;
  initialStock: string;
};

const fromProduct = (p?: AdminProduct): Draft => ({
  name: p?.name ?? '',
  slug: p?.slug ?? '',
  categoryId: p?.categoryId ?? '',
  brand: p?.brand ?? '',
  specs: (p?.attributes?.specs ?? []).map((r) => ({ group: r.group ?? '', name: r.name, value: r.value })),
  description: p?.description ?? '',
  basePrice: p?.basePrice ?? '',
  compareAtPrice: p?.compareAtPrice ?? '',
  status: p?.status ?? 'DRAFT',
  isFeatured: p?.isFeatured ?? false,
  pickupOnly: p?.pickupOnly ?? false,
  returnOverride: p?.returnWindowDays == null ? '' : String(p.returnWindowDays),
  images: p?.images ?? [],
  sku: '',
  initialStock: '0',
});

export function ProductForm({ product, onSaved }: { product?: AdminProduct; onSaved?: (p: AdminProduct) => void }) {
  const isNew = !product;
  const router = useRouter();
  const saver = useSaver();
  const { options, effective } = useCategoryOptions();
  const brands = useLoad(() => api.get<{ name: string }[]>('/brands').then((r) => r.data.map((b) => b.name)), []).data ?? [];
  const [d, setD] = useState<Draft>(() => fromProduct(product));
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));

  function validate() {
    const e: Record<string, string> = {};
    if (d.name.trim().length < 2) e.name = 'Enter a product name.';
    if (!d.categoryId) e.categoryId = 'Choose a category.';
    if (!d.description.trim()) e.description = 'Add a short description.';
    if (!MONEY_RE.test(d.basePrice)) e.basePrice = 'Enter a price like 145 or 145.50.';
    if (d.compareAtPrice && !MONEY_RE.test(d.compareAtPrice)) e.compareAtPrice = 'Enter a price like 160, or leave empty.';
    if (d.returnOverride !== '' && !/^\d{1,2}$/.test(d.returnOverride)) e.returnOverride = 'Enter working days (0–60).';
    if (isNew) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(d.slug)) e.slug = 'Use lowercase letters, numbers and hyphens.';
      if (d.sku.trim().length < 2) e.sku = 'Enter a SKU (your stock code).';
      if (!/^\d+$/.test(d.initialStock)) e.initialStock = 'Enter a whole number.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const common = {
      name: d.name.trim(),
      description: d.description.trim(),
      categoryId: d.categoryId,
      brand: d.brand.trim() || (isNew ? undefined : null),
      specs: d.specs.filter((r) => r.name.trim() && r.value.trim()).map((r) => ({ group: r.group.trim() || undefined, name: r.name.trim(), value: r.value.trim() })),
      basePrice: d.basePrice,
      compareAtPrice: d.compareAtPrice || (isNew ? undefined : null),
      status: d.status,
      isFeatured: d.isFeatured,
      pickupOnly: d.pickupOnly,
      returnWindowDays: d.returnOverride === '' ? (isNew ? undefined : null) : Number(d.returnOverride),
      images: d.images,
    };
    if (isNew) {
      const created = await saver.run(
        () => adminApi.createProduct({ ...common, status: d.status === 'ARCHIVED' ? 'DRAFT' : d.status, slug: d.slug, variants: [{ name: 'Standard', sku: d.sku.trim(), stockOnHand: Number(d.initialStock) }] }),
        'Product created',
      );
      if (created) router.replace(`/admin/products/${created.id}`);
    } else {
      const updated = await saver.run(() => adminApi.updateProduct(product.id, common), 'Changes saved');
      if (updated) onSaved?.(updated);
    }
  }

  const fe = { ...errors, ...(saver.fields ?? {}) };
  const catDays = d.categoryId ? effective(d.categoryId) : null;

  return (
    <form onSubmit={save} noValidate className="space-y-8">
      <section className="panel grid gap-5 p-5 sm:grid-cols-2">
        <Field id="name" label="Name" error={fe.name} className="sm:col-span-2">
          <input id="name" className="field" value={d.name} aria-invalid={Boolean(fe.name)} onChange={(e) => { set('name', e.target.value); if (!slugTouched) set('slug', slugify(e.target.value)); }} />
        </Field>
        <Field id="slug" label="Web address" hint={isNew ? `Your page will be /products/${d.slug || '…'}` : 'Can’t be changed after creation, so links keep working.'} error={fe.slug}>
          <input id="slug" className="field" value={d.slug} readOnly={!isNew} aria-invalid={Boolean(fe.slug)} onChange={(e) => { setSlugTouched(true); set('slug', e.target.value); }} />
        </Field>
        <Field id="categoryId" label="Category" error={fe.categoryId}>
          <select id="categoryId" className="field" value={d.categoryId} aria-invalid={Boolean(fe.categoryId)} onChange={(e) => set('categoryId', e.target.value)}>
            <option value="">Choose a category</option>
            {options.map((o) => <option key={o.id} value={o.id}>{o.label}{o.active ? '' : ' (hidden)'}</option>)}
          </select>
        </Field>
        <Field id="brand" label="Brand (optional)" hint="Mainly for kitchenware and decoration. Leave empty for your own cakes.">
          <input id="brand" className="field" list="brand-options" maxLength={60} value={d.brand} onChange={(e) => set('brand', e.target.value)} />
          <datalist id="brand-options">{brands.map((b) => <option key={b} value={b} />)}</datalist>
        </Field>
        <Field id="description" label="Description" error={fe.description} className="sm:col-span-2">
          <textarea id="description" className="field min-h-32" value={d.description} aria-invalid={Boolean(fe.description)} onChange={(e) => set('description', e.target.value)} />
        </Field>
      </section>

      <section className="panel p-5" aria-labelledby="spec-h">
        <h2 id="spec-h" className="text-xl">Specification</h2>
        <p className="mt-1 text-sm text-muted">Shown in the product’s Specification tab. For example: Size › Diameter › 23 cm, Material › Body › Carbon steel, Cake › Serves › 12–15.</p>
        {d.specs.length > 0 && (
          <table className="mt-3 w-full text-sm">
            <thead><tr className="text-left text-muted"><th className="pb-1 font-normal">Group (optional)</th><th className="pb-1 font-normal">Name</th><th className="pb-1 font-normal">Value</th><th /></tr></thead>
            <tbody>
              {d.specs.map((r, i) => {
                const upd = (k: 'group' | 'name' | 'value', v: string) => set('specs', d.specs.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
                return (
                  <tr key={i}>
                    <td className="pr-2 pb-2"><input aria-label={`Row ${i + 1} group`} className="field" list="spec-groups" maxLength={40} value={r.group} onChange={(e) => upd('group', e.target.value)} /></td>
                    <td className="pr-2 pb-2"><input aria-label={`Row ${i + 1} name`} className="field" maxLength={60} value={r.name} onChange={(e) => upd('name', e.target.value)} /></td>
                    <td className="pr-2 pb-2"><input aria-label={`Row ${i + 1} value`} className="field" maxLength={200} value={r.value} onChange={(e) => upd('value', e.target.value)} /></td>
                    <td className="pb-2"><button type="button" className="text-danger underline" onClick={() => set('specs', d.specs.filter((_, j) => j !== i))}>Remove</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <datalist id="spec-groups">{['Size', 'Material', 'Care', 'Cake', 'Ingredients', 'In the box'].map((g) => <option key={g} value={g} />)}</datalist>
        <button type="button" className="btn btn-secondary mt-3" disabled={d.specs.length >= 40} onClick={() => set('specs', [...d.specs, { group: d.specs.at(-1)?.group ?? '', name: '', value: '' }])}>Add a row</button>
      </section>

      <section className="panel p-5" aria-labelledby="photos-h">
        <h2 id="photos-h" className="mb-3 text-xl">Photos</h2>
        <ImageManager images={d.images} onChange={(v) => set('images', v)} />
      </section>

      <section className="panel grid gap-5 p-5 sm:grid-cols-3" aria-labelledby="price-h">
        <h2 id="price-h" className="text-xl sm:col-span-3">Price{isNew ? ' and stock' : ''}</h2>
        <Field id="basePrice" label="Price (GHS, before tax)" error={fe.basePrice}>
          <input id="basePrice" className="field" inputMode="decimal" value={d.basePrice} aria-invalid={Boolean(fe.basePrice)} onChange={(e) => set('basePrice', e.target.value.trim())} />
        </Field>
        <Field id="compareAtPrice" label="Was price (optional)" hint="Shown crossed out when higher than the price." error={fe.compareAtPrice}>
          <input id="compareAtPrice" className="field" inputMode="decimal" value={d.compareAtPrice} onChange={(e) => set('compareAtPrice', e.target.value.trim())} />
        </Field>
        {isNew && (
          <>
            <Field id="sku" label="SKU" hint="Your stock code. You can add more options after saving." error={fe.sku}>
              <input id="sku" className="field" value={d.sku} aria-invalid={Boolean(fe.sku)} onChange={(e) => set('sku', e.target.value.toUpperCase())} />
            </Field>
            <Field id="initialStock" label="Starting stock" error={fe.initialStock}>
              <input id="initialStock" className="field" inputMode="numeric" value={d.initialStock} onChange={(e) => set('initialStock', e.target.value.trim())} />
            </Field>
          </>
        )}
      </section>

      <section className="panel grid gap-5 p-5 sm:grid-cols-2" aria-labelledby="sell-h">
        <h2 id="sell-h" className="text-xl sm:col-span-2">Selling and returns</h2>
        <Field id="status" label="Visibility">
          <select id="status" className="field" value={d.status} onChange={(e) => set('status', e.target.value as Draft['status'])}>
            <option value="DRAFT">Draft (hidden from the shop)</option>
            <option value="PUBLISHED">Published (on sale)</option>
            {!isNew && <option value="ARCHIVED">Archived (no longer sold)</option>}
          </select>
        </Field>
        <Field id="returnOverride" label="Returns period" hint={catDays != null ? `Leave empty to use the category setting: ${describeReturns(catDays)}. Enter 0 for not returnable.` : 'Choose a category first.'} error={fe.returnOverride}>
          <input id="returnOverride" className="field" inputMode="numeric" placeholder={catDays != null ? `Category: ${catDays}` : ''} value={d.returnOverride} onChange={(e) => set('returnOverride', e.target.value.trim())} />
        </Field>
        <div className="flex flex-wrap gap-6 sm:col-span-2">
          <Toggle id="isFeatured" label="Show on the home page" checked={d.isFeatured} onChange={(v) => set('isFeatured', v)} />
          <Toggle id="pickupOnly" label="Pickup only (no delivery)" checked={d.pickupOnly} onChange={(v) => set('pickupOnly', v)} />
        </div>
      </section>

      <div className="sticky bottom-0 flex items-center gap-4 border-t border-flour bg-cream py-4">
        <button type="submit" className="btn btn-primary" disabled={saver.saving}>{isNew ? 'Create product' : 'Save changes'}</button>
        <SaveStatus status={saver.status} message={saver.message} />
      </div>
    </form>
  );
}
