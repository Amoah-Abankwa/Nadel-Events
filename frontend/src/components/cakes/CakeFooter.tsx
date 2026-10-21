import Link from 'next/link';
import { IconMail, IconPhone, IconPin } from '@/components/icons/Icons';
import { siteConfig } from '@/lib/config';
import { IconCupcake } from './Shapes';
import { PolicyLinks } from '@/components/support/PolicyLinks';

const OCCASIONS = ['Birthday', 'Wedding', 'Naming ceremony', 'Anniversary', 'Office party', 'Kids’ party'];
const SOCIAL = [
  { label: 'Instagram', href: process.env.NEXT_PUBLIC_INSTAGRAM_URL },
  { label: 'Facebook', href: process.env.NEXT_PUBLIC_FACEBOOK_URL },
  { label: 'TikTok', href: process.env.NEXT_PUBLIC_TIKTOK_URL },
].filter((s): s is { label: string; href: string } => Boolean(s.href));

const H = ({ children }: { children: React.ReactNode }) => (
  <h2 className="font-script text-4xl font-normal text-paper after:mt-2 after:block after:h-0.5 after:w-8 after:bg-paper/70" style={{ color: 'inherit' }}>{children}</h2>
);

/** Warm cocoa footer: about, shop by occasion, opening hours, contact and follow us. */
export function CakeFooter() {
  return (
    <footer className="bg-cocoa text-[15px] text-cream/85">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="flex items-center gap-2 text-paper"><IconCupcake className="size-10 text-[#F2A1AD]" /><span className="text-2xl font-bold uppercase tracking-wide">{siteConfig.storeName}<span className="text-[#F2A1AD]"> cakes</span></span></p>
          <p className="mt-5">Cakes, cupcakes and pastries baked to order, plus custom cakes for every celebration. Pick up from our shop or have them delivered.</p>
        </div>
        <div>
          <H>Shop by occasion</H>
          <ul className="mt-5 flex flex-wrap gap-2.5">
            {OCCASIONS.map((o) => (
              <li key={o}><Link href={`/services/request?service=custom-cake&occasion=${encodeURIComponent(o)}`} className="block border border-cream/70 px-2.5 py-1.5 text-sm text-paper hover:bg-paper hover:text-cocoa">{o}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <H>Opening hours</H>
          <p className="mt-5 text-paper">{siteConfig.pickupHours || 'See our contact page'}</p>
          <h3 className="mt-6 font-script text-3xl font-normal text-paper" style={{ color: 'inherit' }}>Custom orders</h3>
          <Link href="/services/request?service=custom-cake" className="mt-3 inline-block bg-rose px-3 py-1.5 text-paper hover:bg-rose-deep">Request a cake quote</Link>
          <p className="mt-2 text-sm">Give us a few days’ notice for celebration cakes.</p>
        </div>
        <div>
          <H>Contact us</H>
          <ul className="mt-5 space-y-3">
            {siteConfig.pickupAddress && <li className="flex gap-3"><IconPin className="mt-0.5 size-4 shrink-0" />{siteConfig.pickupAddress}</li>}
            {siteConfig.contactPhone && <li className="flex gap-3"><IconPhone className="mt-0.5 size-4 shrink-0" /><a href={`tel:${siteConfig.contactPhone.replace(/\s/g, '')}`} className="hover:text-paper">{siteConfig.contactPhone}</a></li>}
            {siteConfig.contactEmail && <li className="flex gap-3"><IconMail className="mt-0.5 size-4 shrink-0" /><a href={`mailto:${siteConfig.contactEmail}`} className="hover:text-paper">{siteConfig.contactEmail}</a></li>}
          </ul>
          {SOCIAL.length > 0 && (
            <>
              <h3 className="mt-6 font-script text-3xl font-normal text-paper" style={{ color: 'inherit' }}>Follow us</h3>
              <ul className="mt-3 flex flex-wrap gap-2">
                {SOCIAL.map((s) => <li key={s.label}><a href={s.href} target="_blank" rel="noopener noreferrer" className="block rounded-full bg-paper px-3 py-1.5 text-sm font-semibold text-cocoa hover:bg-blush">{s.label}</a></li>)}
              </ul>
            </>
          )}
        </div>
      </div>
      <div className="bg-rose text-paper">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4 text-sm">
          <div>
            <p>© {new Date().getFullYear()} {siteConfig.storeName}. <Link href="/" className="underline underline-offset-2">Visit the main shop</Link> for decoration and kitchenware.</p>
            <PolicyLinks className="mt-1 text-xs text-paper/90" linkClassName="underline-offset-2 hover:underline" />
          </div>
          <ul aria-label="Ways to pay" className="flex gap-2 text-xs font-semibold">
            {['Mobile Money', 'Visa', 'Mastercard'].map((m) => <li key={m} className="rounded-sm bg-paper px-2 py-1 text-rose-deep">{m}</li>)}
          </ul>
        </div>
      </div>
    </footer>
  );
}
