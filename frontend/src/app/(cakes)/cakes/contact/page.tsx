import type { Metadata } from 'next';
import { CakeContactForm } from '@/components/cakes/CakeContactForm';
import { PageBanner, ScriptTitle } from '@/components/cakes/PageBanner';
import { IconMail, IconPhone, IconPin } from '@/components/icons/Icons';
import { siteConfig } from '@/lib/config';
import { whatsappLink } from '@/lib/format';

export const metadata: Metadata = { title: 'Contact the cake shop' };

export default function CakeContactPage() {
  const chat = whatsappLink('Hello, I’d like to ask about a cake.');
  const cards = [
    {
      icon: IconPhone,
      title: 'Phone',
      body: (
        <>
          {siteConfig.contactPhone ? <p><strong>Call:</strong> <a href={`tel:${siteConfig.contactPhone.replace(/\s/g, '')}`} className="hover:text-rose">{siteConfig.contactPhone}</a></p> : <p>—</p>}
          {chat && <p><strong>WhatsApp:</strong> <a href={chat} target="_blank" rel="noopener noreferrer" className="hover:text-rose">Message us</a></p>}
        </>
      ),
    },
    { icon: IconMail, title: 'Email', body: siteConfig.contactEmail ? <a href={`mailto:${siteConfig.contactEmail}`} className="hover:text-rose">{siteConfig.contactEmail}</a> : <p>—</p> },
    { icon: IconPin, title: 'Address', body: <><p>{siteConfig.pickupAddress || 'Address coming soon'}</p>{siteConfig.pickupHours && <p className="mt-1 text-muted">{siteConfig.pickupHours}</p>}</> },
  ];
  return (
    <>
      <PageBanner title="Contact" crumbs={[{ label: 'Contact' }]} />
      <div className="mx-auto max-w-5xl px-6 py-16">
        <ul className="grid gap-6 sm:grid-cols-3">
          {cards.map(({ icon: Icon, title, body }) => (
            <li key={title} className="rounded-sm border border-flour p-6 text-sm">
              <span className="inline-flex size-10 items-center justify-center rounded-sm bg-rose text-paper"><Icon className="size-5" /></span>
              <h2 className="mt-5 font-script text-3xl font-normal text-charcoal" style={{ color: undefined }}>{title}</h2>
              <div className="mt-2 space-y-1 leading-relaxed">{body}</div>
            </li>
          ))}
        </ul>
        <section aria-labelledby="cform-h" className="mt-16">
          <ScriptTitle id="cform-h">Contact form</ScriptTitle>
          <div className="mt-5"><CakeContactForm /></div>
        </section>
      </div>
    </>
  );
}
