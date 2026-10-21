'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ErrorState } from '@/components/support/ErrorState';
import { Skeleton } from '@/components/support/Skeleton';
import type { ApiError } from '@/lib/api/errors';
import { FULFILMENT_LABEL, requestsApi, type FulfilmentPreference, type ServiceOption } from '@/lib/api/requests';
import { useRequireSession } from '@/hooks/use-require-session';
import { ReferencePhotos, type UploadedPhoto } from './ReferencePhotos';

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

export function RequestForm() {
  const params = useSearchParams();
  const router = useRouter();
  const { user, ready } = useRequireSession();
  const [catalogue, setCatalogue] = useState<{ leadDays: number; services: ServiceOption[] } | null>(null);
  const [loadError, setLoadError] = useState<ApiError | null>(null);

  const [service, setService] = useState(params.get('service') ?? '');
  const [eventDate, setEventDate] = useState('');
  const [guestCount, setGuestCount] = useState('');
  const [budget, setBudget] = useState('');
  const [preference, setPreference] = useState<FulfilmentPreference>('PICKUP');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState(() => (params.get('occasion') ? `Occasion: ${params.get('occasion')}. ` : ''));
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<ApiError | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    requestsApi.services().then(setCatalogue).catch(setLoadError);
  }, []);
  useEffect(() => {
    if (user?.phone) setPhone((p) => p || user.phone!);
  }, [user]);

  if (loadError) return <ErrorState message={loadError.message} />;
  if (!ready || !catalogue) return <Skeleton className="h-96" />;

  const minDate = isoDay(new Date(Date.now() + catalogue.leadDays * 86_400_000));
  const fe = error?.fieldErrors?.() ?? {};

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSending(true);
    try {
      const r = await requestsApi.create({
        service,
        eventDate,
        guestCount: guestCount ? Number(guestCount) : undefined,
        budget: budget || undefined,
        fulfilmentPreference: preference,
        location: preference === 'PICKUP' ? undefined : location,
        notes,
        referenceImages: photos.map((p) => p.path),
        contactPhone: phone,
      });
      router.replace(`/account/requests/${r.reference}?sent=1`);
    } catch (err) {
      setError(err as ApiError);
      setSending(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-8" noValidate>
      <fieldset className="space-y-3">
        <legend className="label">What do you need?</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {catalogue.services.map((s) => (
            <label key={s.slug} className={`flex cursor-pointer gap-3 rounded-md border p-4 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-burgundy ${service === s.slug ? 'border-burgundy bg-paper' : 'border-crust'}`}>
              <input type="radio" name="service" value={s.slug} checked={service === s.slug} onChange={() => setService(s.slug)} className="mt-1 accent-burgundy" />
              <span><span className="block font-semibold">{s.name}</span><span className="block text-sm text-muted">{s.description}</span></span>
            </label>
          ))}
        </div>
        {fe.service && <p className="text-sm text-danger">Choose a service.</p>}
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-3">
        <div>
          <label htmlFor="eventDate" className="label">Event date</label>
          <input id="eventDate" type="date" min={minDate} className="field" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required aria-invalid={Boolean(fe.eventDate)} aria-describedby="date-hint" />
          <p id="date-hint" className={`mt-1 text-xs ${fe.eventDate ? 'text-danger' : 'text-muted'}`}>{fe.eventDate ? error?.message : `${catalogue.leadDays} days’ notice minimum.`}</p>
        </div>
        <div>
          <label htmlFor="guests" className="label">Guests or servings</label>
          <input id="guests" className="field" inputMode="numeric" value={guestCount} onChange={(e) => setGuestCount(e.target.value.replace(/\D/g, ''))} />
        </div>
        <div>
          <label htmlFor="budget" className="label">Budget, GHS (optional)</label>
          <input id="budget" className="field" inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value.trim())} aria-invalid={Boolean(fe.budget)} />
        </div>
      </div>

      <fieldset className="space-y-3">
        <legend className="label">How should it get to you?</legend>
        <div className="flex flex-wrap gap-3">
          {(Object.keys(FULFILMENT_LABEL) as FulfilmentPreference[]).map((p) => (
            <label key={p} className={`cursor-pointer rounded-sm border px-3 py-2 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-burgundy ${preference === p ? 'border-burgundy bg-burgundy text-paper' : 'border-crust bg-paper'}`}>
              <input type="radio" name="pref" value={p} checked={preference === p} onChange={() => setPreference(p)} className="sr-only" />
              {FULFILMENT_LABEL[p]}
            </label>
          ))}
        </div>
        {preference !== 'PICKUP' && (
          <div>
            <label htmlFor="location" className="label">Venue and town</label>
            <input id="location" className="field" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={200} aria-invalid={Boolean(fe.location)} placeholder="e.g. Golden Tulip, Kumasi" />
            {fe.location && <p className="mt-1 text-xs text-danger">{fe.location}</p>}
          </div>
        )}
      </fieldset>

      <div>
        <label htmlFor="notes" className="label">Describe what you’d like</label>
        <textarea id="notes" className="field min-h-36" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} aria-invalid={Boolean(fe.notes)}
          placeholder="Theme and colours, number of tiers, flavours, any message on the cake, allergies…" />
        {fe.notes && <p className="mt-1 text-xs text-danger">{fe.notes}</p>}
      </div>

      <div>
        <p className="label">Reference photos (optional)</p>
        <ReferencePhotos value={photos} onChange={setPhotos} />
      </div>

      <div className="max-w-xs">
        <label htmlFor="phone" className="label">Phone number</label>
        <input id="phone" type="tel" inputMode="tel" autoComplete="tel" className="field" value={phone} onChange={(e) => setPhone(e.target.value)} aria-invalid={Boolean(fe.contactPhone)} />
        <p className="mt-1 text-xs text-muted">We may call or WhatsApp you about the details.</p>
      </div>

      {error && !Object.keys(fe).length && <ErrorState message={error.message} />}
      {error && Object.keys(fe).length > 0 && <p role="alert" className="text-sm text-danger">{error.message}</p>}

      <button type="submit" className="btn btn-primary" disabled={sending || !service || !eventDate || notes.trim().length < 10 || !phone}>
        {sending ? 'Sending…' : 'Send request'}
      </button>
    </form>
  );
}
