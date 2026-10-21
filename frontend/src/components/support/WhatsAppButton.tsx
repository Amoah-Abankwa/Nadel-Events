import { whatsappLink } from '@/lib/format';
import { siteConfig } from '@/lib/config';

/** Click-to-chat only (SRS 10.1). No order data is ever placed in the URL. */
export function WhatsAppButton({ message = `Hello ${siteConfig.storeName}, I have a question.` }: { message?: string }) {
  const href = whatsappLink(message);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp (opens in a new tab)"
      className="fixed right-4 z-40 inline-flex items-center gap-2 rounded-full bg-success px-4 py-3 text-sm font-semibold text-paper shadow-md hover:brightness-110"
      style={{ bottom: 'max(1rem, calc(env(safe-area-inset-bottom) + 0.5rem))' }}
    >
      <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.7-5.2A8.5 8.5 0 1 1 21 12Z" />
      </svg>
      <span>WhatsApp</span>
    </a>
  );
}
