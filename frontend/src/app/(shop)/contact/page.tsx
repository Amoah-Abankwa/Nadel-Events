import type { Metadata } from 'next';
import { ContactForm } from '@/components/store/ContactForm';
import { StoreColumns } from '@/components/store/StoreColumns';
import { siteConfig } from '@/lib/config';
import { whatsappLink } from '@/lib/format';

export const metadata: Metadata = { title: 'Contact us' };

export default function ContactPage() {
  const chat = whatsappLink(`Hello ${siteConfig.storeName}, I have a question.`);
  return (
    <StoreColumns crumbs={[{ label: 'Contact us' }]}>
      <h1 className="font-sans text-2xl font-normal text-charcoal">Contact us</h1>

      <h2 className="mt-5 font-sans text-xl font-normal text-charcoal">Our location</h2>
      <div className="mt-3 grid gap-6 rounded-sm border border-crust bg-paper p-5 sm:grid-cols-3">
        <div>
          <p className="font-semibold">{siteConfig.storeName}</p>
          <p className="text-[15px]">{siteConfig.pickupAddress || 'Address coming soon'}</p>
        </div>
        <div>
          <p className="font-semibold">Telephone</p>
          {siteConfig.contactPhone ? <a href={`tel:${siteConfig.contactPhone.replace(/\s/g, '')}`} className="text-[15px] hover:text-burgundy">{siteConfig.contactPhone}</a> : <p className="text-[15px]">—</p>}
          {chat && <a href={chat} target="_blank" rel="noopener noreferrer" className="mt-1 block text-sm font-semibold text-burgundy underline-offset-2 hover:underline">WhatsApp us</a>}
        </div>
        <div>
          <p className="font-semibold">Opening times</p>
          <p className="text-[15px]">{siteConfig.pickupHours || '—'}</p>
          {siteConfig.contactEmail && <a href={`mailto:${siteConfig.contactEmail}`} className="mt-1 block text-sm hover:text-burgundy">{siteConfig.contactEmail}</a>}
        </div>
      </div>

      <h2 className="mt-8 border-b border-crust pb-2 font-sans text-xl font-normal text-charcoal">Send us a message</h2>
      <p className="mt-2 text-sm text-muted">For a custom cake or event, the <a href="/services/request" className="underline">quote request form</a> gets you a price fastest.</p>
      <div className="mt-5"><ContactForm /></div>
    </StoreColumns>
  );
}
