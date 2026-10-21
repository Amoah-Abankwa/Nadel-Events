import { siteConfig } from './config';

const fmt = new Intl.NumberFormat(siteConfig.locale, { style: 'currency', currency: siteConfig.currency });

/** Formats a decimal string from the API. Display only: never use for arithmetic. */
export function formatMoney(amount: string | number, currency = siteConfig.currency): string {
  const n = typeof amount === 'string' ? Number(amount) : amount;
  if (currency !== siteConfig.currency) {
    return new Intl.NumberFormat(siteConfig.locale, { style: 'currency', currency }).format(n);
  }
  return fmt.format(n);
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat(siteConfig.locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
}

export function whatsappLink(message: string) {
  if (!siteConfig.whatsappNumber) return null;
  return `https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

/** Only allow same-site relative redirects (prevents open redirects via ?next=). */
export function safeNext(next: string | null | undefined, fallback = '/') {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : fallback;
}

export const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: 'Awaiting payment',
  PAID: 'Paid',
  PAYMENT_FAILED: 'Payment failed',
  PROCESSING: 'Being prepared',
  READY_FOR_PICKUP: 'Ready for pickup',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERY_EXCEPTION: 'Delivery problem',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
  REFUND_PENDING: 'Refund in progress',
};

/** Ghana phone number to WhatsApp's international digits: "024 400 0000" -> "233244000000". */
export function toWhatsAppNumber(phone: string | null | undefined): string | null {
  const digits = (phone ?? '').replace(/\D/g, '');
  const intl = digits.startsWith('233') ? digits : digits.startsWith('0') ? `233${digits.slice(1)}` : digits;
  return intl.length >= 11 ? intl : null;
}

/** Click-to-chat link to a customer's number (staff use), or null if the number isn't usable. */
export function whatsAppTo(phone: string | null | undefined, text?: string): string | null {
  const n = toWhatsAppNumber(phone);
  return n ? `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ''}` : null;
}

/** Page numbers to show around the current page (shared by every pager skin). */
export function pageWindow(page: number, totalPages: number, size = 5): number[] {
  const start = Math.max(1, Math.min(page - Math.floor(size / 2), totalPages - size + 1));
  return Array.from({ length: Math.min(size, totalPages) }, (_, k) => start + k);
}
