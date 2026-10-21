import type { Metadata, Viewport } from 'next';
import { Instrument_Sans, Young_Serif } from 'next/font/google';
import { siteConfig } from '@/lib/config';
import './globals.css';

const display = Young_Serif({ subsets: ['latin'], weight: '400', variable: '--font-young-serif', display: 'swap' });
const sans = Instrument_Sans({ subsets: ['latin'], variable: '--font-instrument-sans', display: 'swap' });

export const metadata: Metadata = {
  title: { default: `${siteConfig.storeName}: baking tools, kitchenware and cakes`, template: `%s | ${siteConfig.storeName}` },
  description: 'Baking accessories, kitchenware, cooking utensils, cake decorations, and freshly made cakes and pastries.',
};

export const viewport: Viewport = { themeColor: '#FBF6EE', width: 'device-width', initialScale: 1 };

/** Root shell only. Storefront chrome lives in (shop)/layout.tsx; the dashboard in admin/layout.tsx. */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
