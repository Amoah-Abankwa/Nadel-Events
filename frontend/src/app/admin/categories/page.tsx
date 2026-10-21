'use client';

import { useState } from 'react';
import { ImageField } from '@/components/admin/ImageField';
import { PageHeader, SaveStatus, Table } from '@/components/admin/ui';
import { describeReturns } from '@/components/admin/product/useCategoryOptions';
import { ErrorState } from '@/components/support/ErrorState';
import { Skeleton } from '@/components/support/Skeleton';
import { adminApi, slugify, type AdminCategory } from '@/lib/api/admin';
import { useLoad, useSaver } from '@/hooks/use-load';

export default function CategoriesPage() {
  const cats = useLoad(() => adminApi.categories(), []);
  const settings = useLoad(() => adminApi.settings(), []);

  if (cats.error) return <ErrorState message={cats.error.message} onRetry={cats.reload} />;
  if (!cats.data || !settings.data) return <Skeleton className="h-64" />;

  const list = cats.data;
  const byId = new Map(list.map((c) => [c.id, c]));
  const storeDefault = settings.data.returnWindowWorkingDays;
  const inherited = (c: AdminCategory): number => {
    let p = c.parentId ? byId.get(c.parentId) : undefined;
    for (let i = 0; p && i < 20; i++) {
      if (p.returnWindowDays != null) return p.returnWindowDays;
      p = p.parentId ? byId.get(p.parentId) : undefined;
    }
    return storeDefault;
  };
  const roots = list.filter((c) => !c.parentId || !byId.has(c.parentId)).sort((a, b) => a.sortOrder - b.sortOrder);
  const ordered: { c: AdminCategory; depth: number }[] = [];
  const walk = (c: AdminCategory, depth: number) => {
    ordered.push({ c, depth });
    list.filter((x) => x.parentId === c.id).sort((a, b) => a.sortOrder - b.sortOrder).forEach((x) => walk(x, depth + 1));
  };
  roots.forEach((r) => walk(r, 0));

  return (
    <>
      <PageHeader
        title="Categories and returns"
        description={`Each category sets how many working days customers have to return items. Leave it empty to inherit from the parent category, or the store default (${describeReturns(storeDefault)}). Enter 0 for not returnable. Changes apply to new orders only.`}
      />
      <Table caption="Categories">
        <thead><tr><th>Category</th><th>Returns period (working days)</th><th>Order</th><th>Shown in shop</th><th /></tr></thead>
        <tbody>
          {ordered.map(({ c, depth }) => <CategoryRow key={c.id} c={c} depth={depth} inherited={inherited(c)} onSaved={cats.reload} />)}
        </tbody>
      </Table>
      <AddCategory categories={list} onAdded={cats.reload} />
    </>
  );
}

function CategoryRow({ c, depth, inherited, onSaved }: { c: AdminCategory; depth: number; inherited: number; onSaved: () => void }) {
  const saver = useSaver();
  const [name, setName] = useState(c.name);
  const [days, setDays] = useState(c.returnWindowDays == null ? '' : String(c.returnWindowDays));
  const [sortOrder, setSortOrder] = useState(String(c.sortOrder));
  const [isActive, setIsActive] = useState(c.isActive);
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState(c.description ?? '');
  const [imageUrl, setImageUrl] = useState<string | null>(c.imageUrl ?? null);
  const daysOk = days === '' || (/^\d{1,2}$/.test(days) && Number(days) <= 60);
  const dirty = name !== c.name || days !== (c.returnWindowDays == null ? '' : String(c.returnWindowDays)) || sortOrder !== String(c.sortOrder) || isActive !== c.isActive || description !== (c.description ?? '') || imageUrl !== (c.imageUrl ?? null);

  return (
    <tr>
      <td style={{ paddingLeft: `${0.75 + depth * 1.25}rem` }}>
        <input aria-label="Category name" className="field min-w-40" value={name} onChange={(e) => setName(e.target.value)} />
        <button type="button" className="mt-1 text-xs underline" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? 'Hide' : 'Description and photo'}</button>
        {open && (
          <div className="mt-2 max-w-sm space-y-3">
            <div>
              <label htmlFor={`cd-${c.id}`} className="label">Description</label>
              <textarea id={`cd-${c.id}`} className="field min-h-20" maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} />
              <p className="text-xs text-muted">Shown on the category page and the cake section.</p>
            </div>
            <ImageField id={`ci-${c.id}`} label="Photo" value={imageUrl} onChange={setImageUrl} hint="Used for “Most popular creations” on /cakes. Landscape, 900×600 px." />
          </div>
        )}
      </td>
      <td>
        <input aria-label={`Returns period for ${c.name}`} className="field w-24" inputMode="numeric" value={days} placeholder={String(inherited)} aria-invalid={!daysOk} onChange={(e) => setDays(e.target.value.trim())} />
        <span className="mt-1 block text-xs text-muted">
          {days === '' ? `Inherited: ${describeReturns(inherited)}` : daysOk ? describeReturns(Number(days)) : 'Enter 0–60'}
        </span>
      </td>
      <td><input aria-label="Display order" className="field w-16" inputMode="numeric" value={sortOrder} onChange={(e) => setSortOrder(e.target.value.trim())} /></td>
      <td><input aria-label={`Show ${c.name} in shop`} type="checkbox" className="size-4 accent-burgundy" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /></td>
      <td className="whitespace-nowrap">
        <button type="button" className="btn btn-primary" disabled={!dirty || !daysOk || saver.saving}
          onClick={async () => {
            const r = await saver.run(() => adminApi.updateCategory(c.id, { name: name.trim(), returnWindowDays: days === '' ? null : Number(days), sortOrder: Number(sortOrder) || 0, isActive, description: description.trim() || null, imageUrl }));
            if (r) onSaved();
          }}>
          Save
        </button>{' '}
        <SaveStatus status={saver.status} message={saver.message} />
      </td>
    </tr>
  );
}

function AddCategory({ categories, onAdded }: { categories: AdminCategory[]; onAdded: () => void }) {
  const saver = useSaver();
  const [f, setF] = useState({ name: '', parentId: '', days: '' });
  const ok = f.name.trim().length >= 2 && (f.days === '' || /^\d{1,2}$/.test(f.days));
  return (
    <form
      className="panel mt-6 flex flex-wrap items-end gap-3 p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await saver.run(
          () => adminApi.createCategory({ name: f.name.trim(), slug: slugify(f.name), parentId: f.parentId || null, returnWindowDays: f.days === '' ? null : Number(f.days), sortOrder: categories.length + 1 }),
          'Category added',
        );
        if (r) { setF({ name: '', parentId: '', days: '' }); onAdded(); }
      }}
    >
      <h2 className="w-full text-xl">Add a category</h2>
      <div><label htmlFor="nc-name" className="label">Name</label><input id="nc-name" className="field w-56" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
      <div>
        <label htmlFor="nc-parent" className="label">Inside</label>
        <select id="nc-parent" className="field w-56" value={f.parentId} onChange={(e) => setF({ ...f, parentId: e.target.value })}>
          <option value="">Top level</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div><label htmlFor="nc-days" className="label">Returns (empty = inherit)</label><input id="nc-days" className="field w-28" inputMode="numeric" value={f.days} onChange={(e) => setF({ ...f, days: e.target.value.trim() })} /></div>
      <button type="submit" className="btn btn-primary" disabled={!ok || saver.saving}>Add category</button>
      <SaveStatus status={saver.status} message={saver.message} />
    </form>
  );
}
