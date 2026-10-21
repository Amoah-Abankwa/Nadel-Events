'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { checkoutApi, type CreateOrderInput } from '@/lib/api/checkout';
import { subscribeToNewsletter } from '@/hooks/use-forms';
import { accountApi, type SavedAddress } from '@/lib/api/account';
import { ApiError } from '@/lib/api/errors';
import type { Address, DeliveryZone, FulfilmentType, PublicSettings, Quote } from '@/lib/types';
import { useHydrated } from '@/hooks/use-hydrated';
import { useRequireSession } from '@/hooks/use-require-session';
import { toLines, useCart } from '@/stores/cart-store';
import { CartNotices } from '../cart/CartNotices';
import { EmptyState } from '../support/EmptyState';
import { ErrorState } from '../support/ErrorState';
import { Skeleton } from '../support/Skeleton';
import { AddressFields } from './AddressFields';
import { FulfilmentSelector } from './FulfilmentSelector';
import { OrderSummary } from './OrderSummary';

const EMPTY_ADDRESS: Address = { recipientName: '', phone: '', addressLine: '', region: '', area: '', city: '', deliveryInstructions: '' };
export const PENDING_ORDER_KEY = 'ck-pending-order';

export function CheckoutView() {
  const router = useRouter();
  const hydrated = useHydrated();
  const { user, ready } = useRequireSession();
  const { items, applyValidation } = useCart();

  const [fulfilment, setFulfilment] = useState<FulfilmentType>('PICKUP');
  const [address, setAddress] = useState<Address>(EMPTY_ADDRESS);
  const [contactPhone, setContactPhone] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState<string | undefined>();
  const [notes, setNotes] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [newsletter, setNewsletter] = useState(false);
  const [saved, setSaved] = useState<SavedAddress[]>([]);
  const [savedId, setSavedId] = useState('');
  const [saveAddress, setSaveAddress] = useState(true);

  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<ApiError | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [submitError, setSubmitError] = useState<ApiError | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const attempt = useRef<{ sig: string; key: string } | null>(null);

  const lines = useMemo(() => toLines(items), [items]);
  const hasPickupOnly = items.some((i) => i.pickupOnly);

  // Prefill contact details once the session is known.
  useEffect(() => {
    if (user) {
      setContactPhone((p) => p || user.phone || '');
      setAddress((a) => ({ ...a, recipientName: a.recipientName || user.name, phone: a.phone || user.phone || '' }));
    }
  }, [user]);

  useEffect(() => {
    if (hasPickupOnly) setFulfilment('PICKUP');
  }, [hasPickupOnly]);

  // Carry over what the customer entered in the cart (both re-checked by the server).
  useEffect(() => {
    if (!hydrated) return;
    const { couponCode, deliveryRegion, deliveryArea, note, items: cartItems } = useCart.getState();
    if (note) setNotes((n) => n || note);
    if (couponCode) {
      setCouponInput(couponCode);
      setCoupon(couponCode);
    }
    if (deliveryRegion && !cartItems.some((i) => i.pickupOnly)) {
      setFulfilment('DELIVERY');
      setAddress((a) => ({ ...a, region: a.region || deliveryRegion, area: a.area || deliveryArea }));
    }
  }, [hydrated]);

  // Refresh cart against the server and load delivery areas.
  useEffect(() => {
    if (!ready || !hydrated) return;
    const current = toLines(useCart.getState().items);
    if (current.length) checkoutApi.validateCart(current).then(applyValidation).catch(() => undefined);
    checkoutApi.deliveryZones().then(setZones).catch(() => setZones([]));
    checkoutApi.settings().then(setSettings).catch(() => undefined);
    accountApi.addresses().then((list) => {
      setSaved(list);
      const def = list.find((a) => a.isDefault) ?? list[0];
      if (def) {
        setSavedId(def.id);
        setAddress({ recipientName: def.recipientName, phone: def.phone, addressLine: def.addressLine, region: def.region, area: def.area, city: def.city, deliveryInstructions: def.deliveryInstructions ?? '' });
      }
    }).catch(() => undefined);
  }, [ready, hydrated, applyValidation]);

  // Live quote from the server: the only source of totals.
  const region = fulfilment === 'DELIVERY' ? address.region : undefined;
  const [area, setDebouncedArea] = useState<string | undefined>();
  useEffect(() => {
    const t = setTimeout(() => setDebouncedArea(fulfilment === 'DELIVERY' ? address.area.trim() || undefined : undefined), 400);
    return () => clearTimeout(t);
  }, [fulfilment, address.area]);

  useEffect(() => {
    if (!ready || !lines.length || (fulfilment === 'DELIVERY' && !region)) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    setQuoting(true);
    const t = setTimeout(() => {
      checkoutApi
        .quote({ lines, fulfilmentType: fulfilment, deliveryRegion: region, deliveryArea: area, couponCode: coupon })
        .then((q) => {
          if (cancelled) return;
          setQuote(q);
          setQuoteError(null);
        })
        .catch((e: ApiError) => {
          if (cancelled) return;
          setQuote(null);
          setQuoteError(e);
          if (e.code.startsWith('COUPON_')) setCoupon(undefined);
        })
        .finally(() => !cancelled && setQuoting(false));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [ready, lines, fulfilment, region, area, coupon]);

  if (!hydrated || !ready) {
    return (
      <div className="grid gap-10 lg:grid-cols-[1fr_22rem]">
        <Skeleton className="h-96" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (!items.length) return <EmptyState title="Your cart is empty" action={{ href: '/shop', label: 'Browse the shop' }} />;

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setFieldErrors({});
    const payload: Omit<CreateOrderInput, 'checkoutKey'> = {
      lines,
      fulfilmentType: fulfilment,
      deliveryRegion: region,
      deliveryArea: fulfilment === 'DELIVERY' ? address.area : undefined,
      couponCode: coupon,
      contactPhone,
      address: fulfilment === 'DELIVERY' ? address : undefined,
      notes: notes || undefined,
      acceptTerms,
    };
    // Same payload → same key, so a retry after a network error can't create a second order.
    const sig = JSON.stringify(payload);
    if (attempt.current?.sig !== sig) attempt.current = { sig, key: crypto.randomUUID() };

    setSubmitting(true);
    try {
      const result = await checkoutApi.createOrder({ ...payload, checkoutKey: attempt.current.key });
      sessionStorage.setItem(PENDING_ORDER_KEY, result.orderNumber);
      // Opt-in only: ticked by the customer, never pre-ticked.
      if (newsletter && user?.email) await subscribeToNewsletter(user.email, 'checkout').catch(() => undefined);
      if (fulfilment === 'DELIVERY' && !savedId && saveAddress) {
        await accountApi.addAddress(address).catch(() => undefined); // nice-to-have; never blocks payment
      }
      if (result.payment?.checkoutUrl) {
        window.location.assign(result.payment.checkoutUrl);
      } else {
        router.push(`/checkout/result?order=${encodeURIComponent(result.orderNumber)}`);
      }
    } catch (err) {
      const apiErr = err as ApiError;
      setSubmitError(apiErr);
      setFieldErrors(apiErr.fieldErrors?.() ?? {});
      if (apiErr.code === 'OUT_OF_STOCK' || apiErr.code === 'ITEM_UNAVAILABLE') {
        checkoutApi.validateCart(lines).then(applyValidation).catch(() => undefined);
      }
      setSubmitting(false);
    }
  }

  const canSubmit = Boolean(quote) && !quoting && acceptTerms && contactPhone.trim().length >= 9 && !submitting;

  return (
    <form onSubmit={placeOrder} className="grid gap-10 lg:grid-cols-[1fr_22rem]" noValidate>
      <div className="space-y-10">
        <CartNotices />

        <section aria-labelledby="contact-heading" className="space-y-4">
          <h2 id="contact-heading" className="text-2xl">Contact</h2>
          <p className="text-sm text-muted">Signed in as {user?.email}. We send your receipt here.</p>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4 accent-burgundy" checked={newsletter} onChange={(e) => setNewsletter(e.target.checked)} />
            Email me with news and offers
          </label>
          <div className="max-w-sm">
            <label htmlFor="contactPhone" className="label">Phone number</label>
            <input id="contactPhone" className="field" type="tel" inputMode="tel" autoComplete="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} aria-invalid={Boolean(fieldErrors.contactPhone)} required />
            {fieldErrors.contactPhone && <p className="mt-1 text-sm text-danger">{fieldErrors.contactPhone}</p>}
          </div>
        </section>

        <section aria-labelledby="fulfilment-heading" className="space-y-4">
          <h2 id="fulfilment-heading" className="text-2xl">Pickup or delivery</h2>
          <FulfilmentSelector
            value={fulfilment}
            onChange={setFulfilment}
            deliveryDisabledReason={hasPickupOnly ? 'Some items are pickup only' : zones.length === 0 ? 'Delivery is not available right now' : undefined}
          />
          {fulfilment === 'DELIVERY' && saved.length > 0 && (
            <div className="max-w-md">
              <label htmlFor="saved-address" className="label">Deliver to</label>
              <select id="saved-address" className="field" value={savedId} onChange={(e) => {
                const a = saved.find((x) => x.id === e.target.value);
                setSavedId(e.target.value);
                setAddress(a ? { recipientName: a.recipientName, phone: a.phone, addressLine: a.addressLine, region: a.region, area: a.area, city: a.city, deliveryInstructions: a.deliveryInstructions ?? '' } : { ...EMPTY_ADDRESS, recipientName: user?.name ?? '', phone: user?.phone ?? '' });
              }}>
                {saved.map((a) => <option key={a.id} value={a.id}>{a.recipientName}, {a.area}, {a.region}</option>)}
                <option value="">A new address</option>
              </select>
            </div>
          )}
          {fulfilment === 'DELIVERY' && (
            <AddressFields value={address} onChange={(a) => { setAddress(a); if (savedId) setSavedId(''); }} zones={zones} errors={fieldErrors} />
          )}
          {fulfilment === 'DELIVERY' && !savedId && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-4 accent-burgundy" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} />
              Save this address to my account
            </label>
          )}
        </section>

        <section aria-labelledby="coupon-heading" className="space-y-3">
          <h2 id="coupon-heading" className="text-2xl">Coupon</h2>
          <div className="flex max-w-sm gap-2">
            <label htmlFor="coupon" className="sr-only">Coupon code</label>
            <input id="coupon" className="field uppercase" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} autoComplete="off" />
            <button type="button" className="btn btn-secondary" onClick={() => setCoupon(couponInput.trim().toUpperCase() || undefined)}>Apply</button>
          </div>
          {coupon && quote?.couponCode && (
            <p className="text-sm text-success">
              {quote.couponCode} applied.{' '}
              <button type="button" className="underline" onClick={() => { setCoupon(undefined); setCouponInput(''); }}>Remove</button>
            </p>
          )}
        </section>

        <section aria-labelledby="notes-heading" className="space-y-3">
          <h2 id="notes-heading" className="text-2xl">Notes</h2>
          <label htmlFor="notes" className="sr-only">Order notes</label>
          <textarea id="notes" className="field min-h-24" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Message on the cake, preferred pickup time…" />
        </section>

        {quoteError && <ErrorState message={quoteError.message} />}
        {submitError && <ErrorState message={submitError.message} />}
      </div>

      <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <OrderSummary items={items} quote={quote} loading={quoting} fulfilment={fulfilment} />
        <label className="flex gap-3 text-sm">
          <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="mt-1 size-4 accent-burgundy" />
          <span>
            I agree to the <Link href="/terms" className="underline">terms</Link> and <Link href="/returns" className="underline">returns policy</Link>.
          </span>
        </label>
        <button type="submit" className="btn btn-primary w-full" disabled={!canSubmit}>
          {submitting ? 'Placing order…' : quote ? `Place order and pay` : 'Complete the details above'}
        </button>
        <p className="text-xs text-muted">
          You’ll be taken to our payment provider to pay securely.
          {settings ? ` Your items are held for ${settings.paymentWindowMinutes} minutes while you pay.` : ''} Your order is confirmed once payment is verified.
        </p>
      </div>
    </form>
  );
}
