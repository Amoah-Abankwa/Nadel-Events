import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env';
import type { Prisma, Service, ServiceRequest, User } from '../../generated/prisma/client';
import type { Tx } from '../../prisma/transaction';
import { dec, money } from '../../common/utils/money';
import { OutboxService } from './outbox.service';
import type { ServiceEmailPayload } from './templates/email-templates';

type Full = ServiceRequest & { service: Service; user: Pick<User, 'name' | 'email'> };
const json = (v: unknown) => JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
const day = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : '');

/** Emails for the custom-cake / event request workflow, written to the outbox in the caller's transaction. */
@Injectable()
export class ServiceNotifier {
  constructor(
    private readonly outbox: OutboxService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  submitted(tx: Tx, r: Full) {
    const p = this.payload(r);
    return this.outbox.enqueue(tx, [
      { channel: 'EMAIL', type: 'SERVICE_REQUEST_RECEIVED', recipient: r.user.email, idempotencyKey: `sr:${r.id}:received`, payload: json(p) },
      ...this.owner('OWNER_SERVICE_REQUEST', `sr:${r.id}:owner-new`, p),
    ]);
  }

  quoted(tx: Tx, r: Full) {
    return this.outbox.enqueue(tx, [
      // A re-quote is a new email: key includes the quote time.
      { channel: 'EMAIL', type: 'SERVICE_QUOTE_READY', recipient: r.user.email, idempotencyKey: `sr:${r.id}:quote:${r.quotedAt?.getTime()}`, payload: json(this.payload(r)) },
    ]);
  }

  depositPaid(tx: Tx, r: Full) {
    const p = this.payload(r);
    return this.outbox.enqueue(tx, [
      { channel: 'EMAIL', type: 'DEPOSIT_CONFIRMED', recipient: r.user.email, idempotencyKey: `sr:${r.id}:deposit-paid`, payload: json(p) },
      ...this.owner('OWNER_DEPOSIT_PAID', `sr:${r.id}:owner-deposit`, p),
    ]);
  }

  /** Status change made by staff: tell the customer. */
  statusToCustomer(tx: Tx, r: Full) {
    return this.outbox.enqueue(tx, [
      { channel: 'EMAIL', type: 'SERVICE_REQUEST_UPDATE', recipient: r.user.email, idempotencyKey: `sr:${r.id}:status:${r.status}:${r.updatedAt.getTime()}`, payload: json({ ...this.payload(r), status: r.status, reason: r.closedReason ?? undefined }) },
    ]);
  }

  /** Status change made by the customer: tell the owner. */
  statusToOwner(tx: Tx, r: Full) {
    return this.outbox.enqueue(tx, this.owner('OWNER_SERVICE_UPDATE', `sr:${r.id}:owner-status:${r.status}:${r.updatedAt.getTime()}`, { ...this.payload(r), status: r.status, reason: r.closedReason ?? undefined }));
  }

  private owner(type: string, key: string, p: ServiceEmailPayload) {
    const owner = this.config.get('OWNER_EMAIL', { infer: true });
    return owner ? [{ channel: 'EMAIL' as const, type, recipient: owner, idempotencyKey: key, payload: json(p) }] : [];
  }

  private payload(r: Full): ServiceEmailPayload {
    const web = this.config.get('WEB_URL', { infer: true });
    const quote = r.quoteAmount ? dec(r.quoteAmount) : null;
    const deposit = r.depositAmount ? dec(r.depositAmount) : null;
    return {
      storeName: this.config.get('STORE_NAME', { infer: true }),
      reference: r.reference,
      customerName: r.user.name,
      contactPhone: r.contactPhone,
      serviceName: r.service.name,
      eventDate: day(r.eventDate),
      currency: this.config.get('CURRENCY', { infer: true }),
      budget: r.budget ? money(r.budget) : undefined,
      quoteAmount: quote ? money(quote) : undefined,
      depositAmount: deposit ? money(deposit) : undefined,
      balance: quote ? money(quote.sub(deposit ?? 0)) : undefined,
      quoteNote: r.quoteNote ?? undefined,
      quoteValidUntil: day(r.quoteValidUntil),
      url: `${web}/account/requests/${r.reference}`,
      adminUrl: `${web}/admin/requests/${r.reference}`,
    };
  }
}
