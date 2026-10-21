export const siteConfig = {
  storeName: process.env.NEXT_PUBLIC_STORE_NAME ?? 'Nadel Events',
  currency: process.env.NEXT_PUBLIC_CURRENCY ?? 'GHS',
  locale: process.env.NEXT_PUBLIC_LOCALE ?? 'en-GH',
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1',
  whatsappNumber: (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '').replace(/\D/g, ''),
  announcement: process.env.NEXT_PUBLIC_ANNOUNCEMENT ?? '',
  pickupAddress: process.env.NEXT_PUBLIC_PICKUP_ADDRESS ?? '',
  pickupHours: process.env.NEXT_PUBLIC_PICKUP_HOURS ?? '',
  paymentMode: process.env.NEXT_PUBLIC_PAYMENT_MODE ?? 'mock',
  contactPhone: process.env.NEXT_PUBLIC_CONTACT_PHONE ?? '',
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? '',
  tagline: process.env.NEXT_PUBLIC_TAGLINE ?? 'You imagine, We create',
} as const;
