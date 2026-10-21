'use client';

import { useState } from 'react';
import { AddressEditor, EMPTY_ADDRESS } from '@/components/account/AddressEditor';
import { ErrorState } from '@/components/support/ErrorState';
import { Skeleton } from '@/components/support/Skeleton';
import { accountApi, type SavedAddress } from '@/lib/api/account';
import type { ApiError } from '@/lib/api/errors';
import { useLoad } from '@/hooks/use-load';

export default function AddressesPage() {
  const { data, error, reload } = useLoad(() => accountApi.addresses(), []);
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState<string>();

  const strip = (a: SavedAddress) => ({ recipientName: a.recipientName, phone: a.phone, addressLine: a.addressLine, region: a.region, area: a.area, city: a.city, deliveryInstructions: a.deliveryInstructions ?? '' });
  const act = async (fn: () => Promise<unknown>) => {
    setFieldErrors({});
    setActionError(undefined);
    try {
      await fn();
      setEditing(null);
      await reload();
    } catch (e) {
      const err = e as ApiError;
      const fe = Object.fromEntries(Object.entries(err.fieldErrors()).map(([k, v]) => [k.replace(/^address\./, ''), v]));
      setFieldErrors(fe);
      if (!Object.keys(fe).length) setActionError(err.message);
    }
  };

  if (error) return <ErrorState message={error.message} onRetry={reload} />;
  if (!data) return <Skeleton className="h-48" />;

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-sans text-2xl font-normal text-charcoal">Address book</h1>
        {editing !== 'new' && <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>Add address</button>}
      </div>
      {actionError && <div className="mb-4"><ErrorState message={actionError} /></div>}
      {editing === 'new' && (
        <div className="panel mb-8 p-5">
          <AddressEditor initial={EMPTY_ADDRESS} submitLabel="Save address" errors={fieldErrors} onCancel={() => setEditing(null)} onSubmit={(a) => act(() => accountApi.addAddress(a))} />
        </div>
      )}
      {data.length === 0 && editing !== 'new' && <p className="text-[15px]">You have no saved addresses. Add one to fill in delivery details faster at checkout.</p>}
      <ul className="space-y-4">
        {data.map((a) => (
          <li key={a.id} className="panel p-5">
            {editing === a.id ? (
              <AddressEditor initial={strip(a)} submitLabel="Save changes" errors={fieldErrors} onCancel={() => setEditing(null)} onSubmit={(x) => act(() => accountApi.updateAddress(a.id, x))} />
            ) : (
              <div className="flex flex-wrap justify-between gap-4">
                <address className="not-italic leading-relaxed">
                  <span className="font-semibold">{a.recipientName}</span>{a.isDefault && <span className="ml-2 rounded-sm bg-flour px-2 py-0.5 text-xs font-semibold">Default</span>}<br />
                  {a.addressLine}<br />{a.area}, {a.city}<br />{a.region} Region<br />{a.phone}
                </address>
                <div className="flex flex-wrap items-start gap-3 text-sm">
                  <button type="button" className="underline" onClick={() => setEditing(a.id)}>Edit</button>
                  {!a.isDefault && <button type="button" className="underline" onClick={() => act(() => accountApi.updateAddress(a.id, { isDefault: true }))}>Make default</button>}
                  <button type="button" className="text-danger underline" onClick={() => act(() => accountApi.deleteAddress(a.id))}>Remove</button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
