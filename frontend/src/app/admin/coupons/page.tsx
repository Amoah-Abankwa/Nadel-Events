'use client';

import { useState } from 'react';
import { Field, PageHeader, SaveStatus, Table, Toggle } from '@/components/admin/ui';
import { ErrorState } from '@/components/support/ErrorState';
import { Skeleton } from '@/components/support/Skeleton';
import { MONEY_RE, adminApi, type AdminCategory, type AdminCoupon } from '@/lib/api/admin';
import { formatMoney } from '@/lib/format';
import { useLoad, useSaver } from '@/hooks/use-load';

// Ghana is UTC+0, so <input type="datetime-local"> values are read and written as UTC.
const toInput = (iso: string | null) => (iso ? iso.slice(0, 16) : '');
const fromInput = (v: string) => (v ? `${v}:00.000Z` : null);
const shortDate = (iso: string) => new Date(iso).toLocaleString('en-GH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });

function state(c: AdminCoupon): { label: string; tone: string } {
  const now = Date.now();
  if (!c.isActive) return { label: 'Off', tone: 'text-muted' };
  if (c.maxUses != null && c.usedCount >= c.maxUses) return { label: 'Used up', tone: 'text-muted' };
  if (c.endsAt && new Date(c.endsAt).getTime() < now) return { label: 'Ended', tone: 'text-muted' };
  if (c.startsAt && new Date(c.startsAt).getTime() > now) return { label: 'Scheduled', tone: 'text-cocoa' };
  return { label: 'Live', tone: 'font-semibold text-success' };
}

function describe(c: AdminCoupon) {
  const off = c.discountType === 'PERCENT' ? `${Number(c.value)}% off` : `${formatMoney(c.value)} off`;
  const bits = [
    c.maxDiscount && c.discountType === 'PERCENT' ? `up to ${formatMoney(c.maxDiscount)}` : null,
    c.minimumSpend ? `on orders over ${formatMoney(c.minimumSpend)}` : null,
    c.firstOrderOnly ? 'first order only' : null,
    c.categoryIds.length ? `${c.categoryIds.length} categor${c.categoryIds.length === 1 ? 'y' : 'ies'} only` : null,
  ].filter(Boolean);
  return [off, ...bits].join(', ');
}

export default function CouponsPage() {
  const coupons = useLoad(() => adminApi.coupons(), []);
  const cats = useLoad(() => adminApi.categories(), []);
  const [editing, setEditing] = useState<string | 'new' | null>(null);

  if (coupons.error) return <ErrorState message={coupons.error.message} onRetry={coupons.reload} />;
  if (!coupons.data || !cats.data) return <Skeleton className="h-64" />;

  const done = () => { setEditing(null); coupons.reload(); };

  return (
    <>
      <PageHeader
        title="Coupons"
        description="Customers enter the code at checkout. Discounts are worked out on the server, before delivery and tax. One coupon per order."
        actions={editing !== 'new' && <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>New coupon</button>}
      />
      {editing === 'new' && <CouponEditor categories={cats.data} onDone={done} onCancel={() => setEditing(null)} />}

      <Table caption="Coupons">
        <thead><tr><th>Code</th><th>Discount</th><th>When</th><th className="text-right">Used</th><th>Status</th><th /></tr></thead>
        <tbody>
          {coupons.data.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-muted">No coupons yet.</td></tr>}
          {coupons.data.map((c) => {
            const st = state(c);
            return editing === c.id ? (
              <tr key={c.id}><td colSpan={6} className="!p-0"><CouponEditor coupon={c} categories={cats.data!} onDone={done} onCancel={() => setEditing(null)} inline /></td></tr>
            ) : (
              <tr key={c.id}>
                <td className="font-mono font-semibold">{c.code}{c.description && <span className="block font-sans text-xs font-normal text-muted">{c.description}</span>}</td>
                <td>{describe(c)}</td>
                <td className="whitespace-nowrap text-xs">
                  {c.startsAt || c.endsAt ? <>{c.startsAt ? shortDate(c.startsAt) : 'Now'} to {c.endsAt ? shortDate(c.endsAt) : 'no end'}</> : 'Always'}
                </td>
                <td className="text-right">{c.usedCount}{c.maxUses != null ? ` / ${c.maxUses}` : ''}</td>
                <td className={st.tone}>{st.label}</td>
                <td className="text-right"><button type="button" className="text-sm underline" onClick={() => setEditing(c.id)}>Edit</button></td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </>
  );
}

function CouponEditor({ coupon, categories, onDone, onCancel, inline }: { coupon?: AdminCoupon; categories: AdminCategory[]; onDone: () => void; onCancel: () => void; inline?: boolean }) {
  const saver = useSaver();
  const [f, setF] = useState({
    code: coupon?.code ?? '',
    description: coupon?.description ?? '',
    discountType: coupon?.discountType ?? ('PERCENT' as 'PERCENT' | 'FIXED'),
    value: coupon ? String(Number(coupon.value)) : '',
    maxDiscount: coupon?.maxDiscount ?? '',
    minimumSpend: coupon?.minimumSpend ?? '',
    startsAt: toInput(coupon?.startsAt ?? null),
    endsAt: toInput(coupon?.endsAt ?? null),
    maxUses: coupon?.maxUses != null ? String(coupon.maxUses) : '',
    perUserLimit: coupon?.perUserLimit != null ? String(coupon.perUserLimit) : '1',
    firstOrderOnly: coupon?.firstOrderOnly ?? false,
    categoryIds: coupon?.categoryIds ?? [],
    isActive: coupon?.isActive ?? true,
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  const errors: Record<string, string> = { ...(saver.fields ?? {}) };
  if (f.code && !/^[A-Z0-9_-]{3,32}$/.test(f.code)) errors.code = '3–32 letters, numbers, - or _.';
  if (f.value && !(MONEY_RE.test(f.value) && Number(f.value) > 0 && (f.discountType === 'FIXED' || Number(f.value) <= 100))) errors.value = f.discountType === 'PERCENT' ? 'Enter 1–100.' : 'Enter an amount like 20.';
  if (f.maxDiscount && !MONEY_RE.test(f.maxDiscount)) errors.maxDiscount = 'Enter an amount.';
  if (f.minimumSpend && !MONEY_RE.test(f.minimumSpend)) errors.minimumSpend = 'Enter an amount.';
  if (f.startsAt && f.endsAt && f.endsAt <= f.startsAt) errors.endsAt = 'Must be after the start.';
  if (f.maxUses && !/^[1-9]\d*$/.test(f.maxUses)) errors.maxUses = 'Whole number, or empty for no limit.';
  if (f.perUserLimit && !/^[1-9]\d*$/.test(f.perUserLimit)) errors.perUserLimit = 'Whole number, or empty for no limit.';
  const ok = f.code && f.value && Object.keys(errors).filter((k) => !saver.fields?.[k]).length === 0;

  const body = {
    code: f.code,
    description: f.description || undefined,
    discountType: f.discountType,
    value: f.value,
    maxDiscount: f.discountType === 'PERCENT' && f.maxDiscount ? f.maxDiscount : coupon ? null : undefined,
    minimumSpend: f.minimumSpend || (coupon ? null : undefined),
    startsAt: fromInput(f.startsAt) ?? (coupon ? null : undefined),
    endsAt: fromInput(f.endsAt) ?? (coupon ? null : undefined),
    maxUses: f.maxUses ? Number(f.maxUses) : coupon ? null : undefined,
    perUserLimit: f.perUserLimit ? Number(f.perUserLimit) : coupon ? null : undefined,
    firstOrderOnly: f.firstOrderOnly,
    categoryIds: f.categoryIds,
    productIds: coupon?.productIds ?? [],
    isActive: f.isActive,
  };

  return (
    <form
      className={`${inline ? 'bg-cream/60 p-5' : 'panel mb-6 p-5'} space-y-5`}
      onSubmit={async (e) => {
        e.preventDefault();
        if (!ok) return;
        if (await saver.run(() => (coupon ? adminApi.updateCoupon(coupon.id, body) : adminApi.createCoupon(body)), coupon ? 'Coupon saved' : 'Coupon created')) onDone();
      }}
    >
      <h2 className="text-xl">{coupon ? `Edit ${coupon.code}` : 'New coupon'}</h2>
      {coupon && coupon.usedCount > 0 && <p className="text-sm text-muted">Used {coupon.usedCount} times. Changes apply to future orders only.</p>}
      <div className="grid gap-5 sm:grid-cols-4">
        <Field id="code" label="Code" error={errors.code}>
          <input id="code" className="field font-mono uppercase" value={f.code} onChange={(e) => set('code', e.target.value.toUpperCase().replace(/\s/g, ''))} placeholder="EASTER15" />
        </Field>
        <Field id="desc" label="Internal note (optional)" className="sm:col-span-3">
          <input id="desc" className="field" value={f.description} maxLength={200} onChange={(e) => set('description', e.target.value)} placeholder="e.g. Instagram Easter campaign" />
        </Field>
        <Field id="type" label="Discount type">
          <select id="type" className="field" value={f.discountType} onChange={(e) => set('discountType', e.target.value as 'PERCENT' | 'FIXED')}>
            <option value="PERCENT">Percentage off</option>
            <option value="FIXED">Fixed amount off (GHS)</option>
          </select>
        </Field>
        <Field id="value" label={f.discountType === 'PERCENT' ? 'Percent off' : 'Amount off (GHS)'} error={errors.value}>
          <input id="value" className="field" inputMode="decimal" value={f.value} onChange={(e) => set('value', e.target.value.trim())} />
        </Field>
        {f.discountType === 'PERCENT' && (
          <Field id="max" label="Cap the discount at (GHS)" hint="Optional." error={errors.maxDiscount}>
            <input id="max" className="field" inputMode="decimal" value={f.maxDiscount} onChange={(e) => set('maxDiscount', e.target.value.trim())} />
          </Field>
        )}
        <Field id="min" label="Minimum spend (GHS)" hint="Optional. Before delivery and tax." error={errors.minimumSpend}>
          <input id="min" className="field" inputMode="decimal" value={f.minimumSpend} onChange={(e) => set('minimumSpend', e.target.value.trim())} />
        </Field>
        <Field id="starts" label="Starts (Ghana time)" hint="Empty = straight away.">
          <input id="starts" type="datetime-local" className="field" value={f.startsAt} onChange={(e) => set('startsAt', e.target.value)} />
        </Field>
        <Field id="ends" label="Ends (Ghana time)" hint="Empty = no end date." error={errors.endsAt}>
          <input id="ends" type="datetime-local" className="field" value={f.endsAt} onChange={(e) => set('endsAt', e.target.value)} />
        </Field>
        <Field id="maxUses" label="Total uses allowed" hint="Empty = unlimited." error={errors.maxUses}>
          <input id="maxUses" className="field" inputMode="numeric" value={f.maxUses} onChange={(e) => set('maxUses', e.target.value.trim())} />
        </Field>
        <Field id="perUser" label="Uses per customer" hint="Empty = unlimited." error={errors.perUserLimit}>
          <input id="perUser" className="field" inputMode="numeric" value={f.perUserLimit} onChange={(e) => set('perUserLimit', e.target.value.trim())} />
        </Field>
      </div>

      <fieldset>
        <legend className="label">Only for these categories (optional)</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          {categories.map((c) => (
            <label key={c.id} className="inline-flex min-h-9 items-center gap-2 text-sm">
              <input type="checkbox" className="size-4 accent-burgundy" checked={f.categoryIds.includes(c.id)}
                onChange={(e) => set('categoryIds', e.target.checked ? [...f.categoryIds, c.id] : f.categoryIds.filter((x) => x !== c.id))} />
              {c.name}
            </label>
          ))}
        </div>
        <p className="text-xs text-muted">None ticked = the whole cart. Otherwise the discount applies only to items in the ticked categories.</p>
        {coupon && coupon.productIds.length > 0 && <p className="text-xs text-muted">Also limited to {coupon.productIds.length} specific product(s), set through the API.</p>}
      </fieldset>

      <div className="flex flex-wrap gap-6">
        <Toggle id="first" label="First order only" checked={f.firstOrderOnly} onChange={(v) => set('firstOrderOnly', v)} />
        <Toggle id="active" label="Active" checked={f.isActive} onChange={(v) => set('isActive', v)} />
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" className="btn btn-primary" disabled={!ok || saver.saving}>{coupon ? 'Save coupon' : 'Create coupon'}</button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <SaveStatus status={saver.status} message={saver.message} />
      </div>
    </form>
  );
}
