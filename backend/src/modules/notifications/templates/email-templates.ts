import type { EmailMessage } from '../email.sender';

// Minimal, dependency-free templates. Swap for React Email or MJML when the brand kit is ready.

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export interface OrderEmailPayload {
  storeName: string;
  orderNumber: string;
  customerName: string;
  currency: string;
  items: { name: string; quantity: number; lineTotal: string }[];
  subtotal: string;
  discountTotal: string;
  deliveryFee: string;
  taxTotal: string;
  taxLines?: { name: string; ratePercent: string; amount: string }[];
  pricesIncludeTax?: boolean;
  total: string;
  fulfilmentType: 'PICKUP' | 'DELIVERY';
  orderUrl: string;
  status?: string;
  adminUrl?: string;
  customerEmail?: string;
  customerPhone?: string;
  deliveryArea?: string;
}

function layout(storeName: string, title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#FBF6EE;font-family:Arial,Helvetica,sans-serif;color:#2A2624">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #EFE4D2">
<tr><td style="padding:24px 28px;border-bottom:1px solid #EFE4D2;font-family:Georgia,serif;font-size:20px;color:#6B1E2C">${esc(storeName)}</td></tr>
<tr><td style="padding:28px"><h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:22px;font-weight:normal">${esc(title)}</h1>${body}</td></tr>
</table></td></tr></table></body></html>`;
}

function itemsTable(p: OrderEmailPayload) {
  const rows = p.items
    .map((i) => `<tr><td style="padding:6px 0">${esc(i.name)} × ${i.quantity}</td><td align="right">${esc(p.currency)} ${esc(i.lineTotal)}</td></tr>`)
    .join('');
  const line = (label: string, v: string, bold = false) =>
    `<tr><td style="padding:4px 0;${bold ? 'font-weight:bold' : ''}">${label}</td><td align="right" style="${bold ? 'font-weight:bold' : ''}">${esc(p.currency)} ${esc(v)}</td></tr>`;
  return `<table width="100%" style="font-size:14px;border-collapse:collapse">${rows}
<tr><td colspan="2" style="border-top:1px solid #EFE4D2;padding-top:8px"></td></tr>
${line('Subtotal', p.subtotal)}${Number(p.discountTotal) > 0 ? line('Discount', `-${p.discountTotal}`) : ''}
${p.pricesIncludeTax ? '' : taxRows(p, line)}${line(p.fulfilmentType === 'PICKUP' ? 'Pickup' : 'Delivery', p.deliveryFee)}
${line('Total', p.total, true)}${p.pricesIncludeTax ? taxRows(p, (l, v) => line(`Includes ${l}`, v)) : ''}</table>`;
}

function taxRows(p: OrderEmailPayload, line: (label: string, v: string) => string) {
  return (p.taxLines ?? []).filter((t) => Number(t.amount) > 0).map((t) => line(`${esc(t.name)} (${esc(t.ratePercent)}%)`, t.amount)).join('');
}

function textItems(p: OrderEmailPayload) {
  return `${p.items.map((i) => `- ${i.name} x${i.quantity}: ${p.currency} ${i.lineTotal}`).join('\n')}\nTotal: ${p.currency} ${p.total}`;
}

export const templates = {
  ORDER_PLACED: (p: OrderEmailPayload): Omit<EmailMessage, 'to'> => ({
    subject: `Order ${p.orderNumber} received, payment pending`,
    html: layout(p.storeName, `Thanks, ${p.customerName}`, `<p>We have your order <strong>${esc(p.orderNumber)}</strong>. It is <strong>not yet paid</strong>; we will email again as soon as payment is confirmed.</p>${itemsTable(p)}<p><a href="${esc(p.orderUrl)}" style="color:#6B1E2C">View your order</a></p>`),
    text: `Order ${p.orderNumber} received. Payment pending.\n${textItems(p)}\n${p.orderUrl}`,
  }),
  PAYMENT_CONFIRMED: (p: OrderEmailPayload): Omit<EmailMessage, 'to'> => ({
    subject: `Payment confirmed for order ${p.orderNumber}`,
    html: layout(p.storeName, 'Payment confirmed', `<p>Your payment for order <strong>${esc(p.orderNumber)}</strong> is confirmed. This email is your receipt.</p>${itemsTable(p)}<p>${p.fulfilmentType === 'PICKUP' ? 'We will tell you when it is ready for pickup.' : 'We will tell you when it is out for delivery.'}</p><p><a href="${esc(p.orderUrl)}" style="color:#6B1E2C">Track your order</a></p>`),
    text: `Payment confirmed for ${p.orderNumber}.\n${textItems(p)}\n${p.orderUrl}`,
  }),
  ORDER_STATUS_CHANGED: (p: OrderEmailPayload): Omit<EmailMessage, 'to'> => ({
    subject: `Order ${p.orderNumber}: ${statusLabel(p.status)}`,
    html: layout(p.storeName, statusLabel(p.status), `<p>Order <strong>${esc(p.orderNumber)}</strong> is now: ${esc(statusLabel(p.status))}.</p><p><a href="${esc(p.orderUrl)}" style="color:#6B1E2C">View order</a></p>`),
    text: `Order ${p.orderNumber}: ${statusLabel(p.status)}\n${p.orderUrl}`,
  }),
  OWNER_NEW_ORDER: (p: OrderEmailPayload): Omit<EmailMessage, 'to'> => ({
    subject: `New paid order ${p.orderNumber}: ${p.currency} ${p.total} (${p.fulfilmentType.toLowerCase()})`,
    html: layout(p.storeName, `New order ${p.orderNumber}`, `<p>${esc(p.customerName)} · ${esc(p.customerPhone)} · ${esc(p.customerEmail)}</p>${p.deliveryArea ? `<p>Delivery area: ${esc(p.deliveryArea)}</p>` : '<p>Pickup</p>'}${itemsTable(p)}<p><a href="${esc(p.adminUrl)}" style="color:#6B1E2C">Open in admin</a></p>`),
    text: `New paid order ${p.orderNumber}\n${p.customerName} ${p.customerPhone}\n${textItems(p)}\n${p.adminUrl}`,
  }),
  SERVICE_REQUEST_RECEIVED: (p: ServiceEmailPayload): Omit<EmailMessage, 'to'> => ({
    subject: `We received your request ${p.reference}`,
    html: layout(p.storeName, `Thanks, ${p.customerName}`, `<p>We have your ${esc(p.serviceName.toLowerCase())} request for <strong>${esc(p.eventDate)}</strong> (reference ${esc(p.reference)}).</p><p>We’ll send you a quote by email. You can also follow it in your account.</p><p><a href="${esc(p.url)}" style="color:#6B1E2C">View your request</a></p>`),
    text: `We received your request ${p.reference} for ${p.eventDate}. We'll send you a quote.\n${p.url}`,
  }),
  OWNER_SERVICE_REQUEST: (p: ServiceEmailPayload): Omit<EmailMessage, 'to'> => ({
    subject: `New ${p.serviceName.toLowerCase()} request ${p.reference} for ${p.eventDate}`,
    html: layout(p.storeName, `New request ${p.reference}`, `<p>${esc(p.customerName)}, ${esc(p.contactPhone)}</p><p>${esc(p.serviceName)} for ${esc(p.eventDate)}${p.budget ? `, budget ${esc(p.currency)} ${esc(p.budget)}` : ''}.</p><p><a href="${esc(p.adminUrl)}" style="color:#6B1E2C">Open and send a quote</a></p>`),
    text: `New request ${p.reference}: ${p.serviceName} for ${p.eventDate}\n${p.customerName} ${p.contactPhone}\n${p.adminUrl}`,
  }),
  SERVICE_QUOTE_READY: (p: ServiceEmailPayload): Omit<EmailMessage, 'to'> => ({
    subject: `Your quote for ${p.reference}`,
    html: layout(p.storeName, 'Your quote is ready', `<p>For your ${esc(p.serviceName.toLowerCase())} on ${esc(p.eventDate)}:</p>
<table width="100%" style="font-size:14px"><tr><td>Total</td><td align="right"><strong>${esc(p.currency)} ${esc(p.quoteAmount)}</strong></td></tr>
${Number(p.depositAmount) > 0 ? `<tr><td>Deposit to confirm</td><td align="right">${esc(p.currency)} ${esc(p.depositAmount)}</td></tr>` : ''}</table>
${p.quoteNote ? `<p style="white-space:pre-line">${esc(p.quoteNote)}</p>` : ''}<p>This quote is valid until ${esc(p.quoteValidUntil)}.</p>
<p><a href="${esc(p.url)}" style="color:#6B1E2C">${Number(p.depositAmount) > 0 ? 'Accept and pay the deposit' : 'Accept the quote'}</a></p>`),
    text: `Quote for ${p.reference}: ${p.currency} ${p.quoteAmount}${Number(p.depositAmount) > 0 ? ` (deposit ${p.currency} ${p.depositAmount})` : ''}. Valid until ${p.quoteValidUntil}.\n${p.url}`,
  }),
  SERVICE_REQUEST_UPDATE: (p: ServiceEmailPayload): Omit<EmailMessage, 'to'> => ({
    subject: `Update on your request ${p.reference}`,
    html: layout(p.storeName, serviceStatusLabel(p.status), `<p>Your request ${esc(p.reference)} for ${esc(p.eventDate)}: ${esc(serviceStatusLabel(p.status).toLowerCase())}.</p>${p.reason ? `<p>${esc(p.reason)}</p>` : ''}<p><a href="${esc(p.url)}" style="color:#6B1E2C">View your request</a></p>`),
    text: `Request ${p.reference}: ${serviceStatusLabel(p.status)}${p.reason ? `\n${p.reason}` : ''}\n${p.url}`,
  }),
  OWNER_SERVICE_UPDATE: (p: ServiceEmailPayload): Omit<EmailMessage, 'to'> => ({
    subject: `Request ${p.reference}: ${serviceStatusLabel(p.status).toLowerCase()} by customer`,
    html: layout(p.storeName, `Request ${p.reference}`, `<p>${esc(p.customerName)} ${esc(serviceStatusLabel(p.status).toLowerCase())} the request for ${esc(p.eventDate)}.</p>${p.reason ? `<p>Reason: ${esc(p.reason)}</p>` : ''}<p><a href="${esc(p.adminUrl)}" style="color:#6B1E2C">Open request</a></p>`),
    text: `Request ${p.reference} ${serviceStatusLabel(p.status)} by customer. ${p.reason ?? ''}\n${p.adminUrl}`,
  }),
  DEPOSIT_CONFIRMED: (p: ServiceEmailPayload): Omit<EmailMessage, 'to'> => ({
    subject: `Booking confirmed: ${p.reference}`,
    html: layout(p.storeName, 'You’re booked', `<p>We received your deposit of <strong>${esc(p.currency)} ${esc(p.depositAmount)}</strong> for your ${esc(p.serviceName.toLowerCase())} on ${esc(p.eventDate)}. This email is your receipt.</p><p>Balance due: ${esc(p.currency)} ${esc(p.balance)}.</p>${p.quoteNote ? `<p style="white-space:pre-line">${esc(p.quoteNote)}</p>` : ''}<p><a href="${esc(p.url)}" style="color:#6B1E2C">View your booking</a></p>`),
    text: `Booking ${p.reference} confirmed. Deposit ${p.currency} ${p.depositAmount} received. Balance ${p.currency} ${p.balance}.\n${p.url}`,
  }),
  OWNER_DEPOSIT_PAID: (p: ServiceEmailPayload): Omit<EmailMessage, 'to'> => ({
    subject: `Deposit paid: ${p.reference} for ${p.eventDate}`,
    html: layout(p.storeName, `Booked: ${p.reference}`, `<p>${esc(p.customerName)} (${esc(p.contactPhone)}) paid the ${esc(p.currency)} ${esc(p.depositAmount)} deposit for ${esc(p.serviceName.toLowerCase())} on ${esc(p.eventDate)}.</p><p><a href="${esc(p.adminUrl)}" style="color:#6B1E2C">Open booking</a></p>`),
    text: `Deposit paid for ${p.reference} (${p.eventDate}) by ${p.customerName}.\n${p.adminUrl}`,
  }),
  REFUND_ISSUED: (p: { storeName: string; orderNumber: string; customerName: string; currency: string; amount: string; full: boolean; method: string; reason: string; orderUrl: string }): Omit<EmailMessage, 'to'> => ({
    subject: `Refund for order ${p.orderNumber}`,
    html: layout(p.storeName, 'Your refund', `<p>Hi ${esc(p.customerName)}, we’ve refunded <strong>${esc(p.currency)} ${esc(p.amount)}</strong>${p.full ? ' (the full amount)' : ''} for order ${esc(p.orderNumber)}.</p><p>${p.method === 'PROVIDER' ? 'It goes back to the account or mobile money wallet you paid with. It can take a few working days to show.' : 'We’ve sent it to you directly.'}</p><p>Reason: ${esc(p.reason)}</p><p><a href="${esc(p.orderUrl)}" style="color:#6B1E2C">View your order</a></p>`),
    text: `Refund of ${p.currency} ${p.amount} for order ${p.orderNumber}. Reason: ${p.reason}\n${p.orderUrl}`,
  }),
  GIVEAWAY_WON: (p: { storeName: string; name: string; title: string; prize: string; url: string }): Omit<EmailMessage, 'to'> => ({
    subject: `You won: ${p.title}`,
    html: layout(p.storeName, 'Congratulations!', `<p>Hi ${esc(p.name)}, you’ve won <strong>${esc(p.prize)}</strong> in our ${esc(p.title)} giveaway.</p><p>Reply to this email or message us on WhatsApp within 7 days to arrange collection. We’ll never ask you for a payment or PIN to claim a prize.</p><p><a href="${esc(p.url)}" style="color:#6B1E2C">See the giveaway</a></p>`),
    text: `You won ${p.prize} in ${p.title}. Contact us within 7 days to claim. We never ask for payment or PINs.\n${p.url}`,
  }),
  CONTACT_MESSAGE: (p: { storeName: string; name: string; email: string; phone: string | null; topic: string; orderNumber: string | null; message: string; adminUrl: string }): Omit<EmailMessage, 'to'> => ({
    subject: `Website message from ${p.name}: ${p.topic}`,
    html: layout(p.storeName, `Message from ${p.name}`, `<p><strong>About:</strong> ${esc(p.topic)}${p.orderNumber ? ` (order ${esc(p.orderNumber)})` : ''}</p><p><a href="mailto:${esc(p.email)}" style="color:#6B1E2C">${esc(p.email)}</a>${p.phone ? ` · ${esc(p.phone)}` : ''}</p><p style="white-space:pre-line">${esc(p.message)}</p><p><a href="${esc(p.adminUrl)}" style="color:#6B1E2C">Open messages</a></p>`),
    text: `Message from ${p.name} <${p.email}> ${p.phone ?? ''}\nAbout: ${p.topic}${p.orderNumber ? ` (order ${p.orderNumber})` : ''}\n\n${p.message}\n\n${p.adminUrl}`,
  }),
  NEWSLETTER_WELCOME: (p: { storeName: string; shopUrl: string; unsubscribeUrl: string }): Omit<EmailMessage, 'to'> => ({
    subject: `You’re on the ${p.storeName} list`,
    html: layout(p.storeName, 'Thanks for signing up', `<p>We’ll send you new cakes, kitchen finds, decoration ideas and offers. Not too often.</p><p><a href="${esc(p.shopUrl)}" style="color:#6B1E2C">Visit the shop</a></p><p style="font-size:12px;color:#6E625B">Changed your mind? <a href="${esc(p.unsubscribeUrl)}" style="color:#6E625B">Unsubscribe</a> at any time.</p>`),
    text: `Thanks for signing up to ${p.storeName}.\n${p.shopUrl}\nUnsubscribe: ${p.unsubscribeUrl}`,
  }),
  PASSWORD_RESET: (p: { name: string; url: string; storeName?: string }): Omit<EmailMessage, 'to'> => ({
    subject: 'Reset your password',
    html: layout(p.storeName ?? '', 'Reset your password', `<p>Hi ${esc(p.name)}, use the link below to set a new password. It expires in 1 hour.</p><p><a href="${esc(p.url)}" style="color:#6B1E2C">Set a new password</a></p><p>If you did not ask for this, ignore this email.</p>`),
    text: `Reset your password (expires in 1 hour): ${p.url}`,
  }),
} as const;

export type TemplateType = keyof typeof templates;

export interface ServiceEmailPayload {
  storeName: string;
  reference: string;
  customerName: string;
  contactPhone: string;
  serviceName: string;
  eventDate: string;
  currency: string;
  budget?: string;
  quoteAmount?: string;
  depositAmount?: string;
  balance?: string;
  quoteNote?: string;
  quoteValidUntil?: string;
  status?: string;
  reason?: string;
  url: string;
  adminUrl: string;
}

function serviceStatusLabel(s?: string) {
  const map: Record<string, string> = {
    CONFIRMED: 'Booking confirmed',
    DECLINED: 'Quote declined',
    REJECTED: 'We can’t take this request',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
  };
  return map[s ?? ''] ?? 'Updated';
}

function statusLabel(s?: string) {
  const map: Record<string, string> = {
    PROCESSING: 'Being prepared',
    READY_FOR_PICKUP: 'Ready for pickup',
    OUT_FOR_DELIVERY: 'Out for delivery',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    REFUND_PENDING: 'Refund in progress',
  };
  return map[s ?? ''] ?? (s ?? 'Updated');
}
