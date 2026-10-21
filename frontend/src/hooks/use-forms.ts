'use client';

import { useState } from 'react';
import { api } from '@/lib/api/client';
import type { ApiError } from '@/lib/api/errors';
import { useSession } from '@/stores/session-store';

export type NewsletterSource = 'home.sidebar' | 'footer' | 'checkout' | 'other';

/** The one call that adds someone to the newsletter (consent is required by the API). */
export const subscribeToNewsletter = (email: string, source: NewsletterSource) => api.post('/newsletter', { email, consent: true, source });

/** Newsletter signup used by every section (consent must be ticked; the API enforces it too). */
export function useNewsletter(source: NewsletterSource) {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState('');
  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setState('sending');
    setError('');
    try {
      if (!consent) throw new Error('consent');
      await subscribeToNewsletter(email, source);
      setState('done');
    } catch (err) {
      setError((err as Error).message === 'consent' ? 'Tick the box to agree to receive our emails.' : (err as ApiError).message);
      setState('idle');
    }
  };
  return { email, setEmail, consent, setConsent, state, error, submit, canSubmit: Boolean(email) && consent && state !== 'sending' };
}

export const CONTACT_TOPICS = [
  ['ORDER', 'An order I placed'],
  ['CUSTOM_CAKE', 'A custom cake or event'],
  ['DELIVERY', 'Delivery or pickup'],
  ['PRODUCT', 'A product (cakes, decoration, kitchenware)'],
  ['OTHER', 'Something else'],
] as const;

type ContactFields = { name: string; email: string; phone: string; topic: string; orderNumber: string; message: string; website: string };

/** Contact form state and submit, shared by the main and cake contact pages (one inbox: Admin → Messages). */
export function useContactForm(initialTopic = 'ORDER') {
  const user = useSession((s) => s.user);
  const [f, setF] = useState<ContactFields>({ name: '', email: '', phone: '', topic: initialTopic, orderNumber: '', message: '', website: '' });
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<ApiError | null>(null);
  const name = f.name || user?.name || '';
  const email = f.email || user?.email || '';
  const bind = (k: keyof ContactFields) => ({
    value: k === 'name' ? name : k === 'email' ? email : f[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((x) => ({ ...x, [k]: e.target.value })),
  });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState('sending');
    setError(null);
    try {
      await api.post('/contact', { ...f, name, email, phone: f.phone || undefined, orderNumber: f.topic === 'ORDER' ? f.orderNumber || undefined : undefined });
      setState('sent');
    } catch (err) {
      setError(err as ApiError);
      setState('idle');
    }
  };
  return { f, bind, name, state, error, fieldErrors: error?.fieldErrors?.() ?? {}, submit };
}
