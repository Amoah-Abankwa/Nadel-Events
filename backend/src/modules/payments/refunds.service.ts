import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env';
import type { Prisma, Refund } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { Tx } from '../../prisma/transaction';
import { AppException } from '../../common/app.exception';
import { dec, money, ZERO } from '../../common/utils/money';
import { AuditService } from '../audit/audit.service';
import { InventoryService } from '../inventory/inventory.service';
import { OutboxService } from '../notifications/outbox.service';
import { PAYMENT_GATEWAY, PaymentGateway, type RefundResult } from './gateways/payment-gateway';

/** A provider refund still pending after this long is shown to staff as stuck. */
export const REFUND_STUCK_AFTER_MS = 24 * 60 * 60_000;

export interface RefundRequest {
  amount: string;
  reason: string;
  method: 'PROVIDER' | 'MANUAL';
  restock: { variantId: string; quantity: number }[];
  idempotencyKey: string;
}

type RestockLine = { variantId: string; quantity: number };

/**
 * Refunds against a verified payment (SRS 8.4, 9.2). Partial or full, through the provider when it
 * supports API refunds, or recorded when staff refunded outside the system.
 * Policies (confirmed by the owner):
 *  - A coupon's use is NOT returned on refund, so a one-time code can't be reused after a refund.
 *  - Provider refunds go through Hubtel's refund API once HUBTEL_REFUNDS_ENABLED is on; they may
 *    complete asynchronously, so PENDING refunds are re-checked server-side until final.
 */
@Injectable()
export class RefundsService {
  private readonly logger = new Logger(RefundsService.name);
  private polling = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
    private readonly inventory: InventoryService,
    private readonly outbox: OutboxService,
    private readonly audit: AuditService,
  ) {}

  capabilities() {
    return { provider: this.gateway.name, providerRefunds: this.gateway.supportsRefunds && typeof this.gateway.refund === 'function' };
  }

  /** What can still be refunded and restocked on an order. */
  async summary(orderNumber: string) {
    const o = await this.prisma.order.findUnique({ where: { orderNumber }, include: { items: true, refunds: { orderBy: { createdAt: 'desc' } }, payments: true } });
    if (!o) throw new NotFoundException();
    const paid = o.payments.filter((p) => ['SUCCEEDED', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(p.status)).reduce((a, p) => a.add(dec(p.amount)), ZERO);
    const refunded = o.refunds.filter((r) => r.status !== 'FAILED').reduce((a, r) => a.add(dec(r.amount)), ZERO);
    const restocked = restockedByVariant(o.refunds);
    return {
      paid: money(paid),
      refunded: money(refunded),
      refundable: money(paid.sub(refunded).lt(0) ? 0 : paid.sub(refunded)),
      restockable: o.items.filter((i) => i.variantId).map((i) => ({ variantId: i.variantId!, name: i.productName, variantName: i.variantName, max: Math.max(0, i.quantity - (restocked.get(i.variantId!) ?? 0)) })),
      refunds: o.refunds.map((r) => ({ id: r.id, amount: money(r.amount), reason: r.reason, method: r.method, status: r.status, failureReason: r.failureReason, providerRefundId: r.providerRefundId, createdAt: r.createdAt, completedAt: r.completedAt, stuck: r.status === 'PENDING' && Date.now() - r.createdAt.getTime() > REFUND_STUCK_AFTER_MS })),
      ...this.capabilities(),
    };
  }

  async create(orderNumber: string, req: RefundRequest, actorId: string, requestId?: string) {
    const existing = await this.prisma.refund.findUnique({ where: { idempotencyKey: req.idempotencyKey } });
    if (existing) return view(existing);
    if (req.method === 'PROVIDER' && !this.capabilities().providerRefunds) {
      throw new AppException(422, 'PROVIDER_REFUNDS_UNAVAILABLE', 'Refunds through the payment provider aren’t set up. Refund in Hubtel or by MoMo, then record it here.');
    }

    const refund = await this.prisma.$transaction(async (tx) => {
      const o = await tx.order.findUnique({ where: { orderNumber } });
      if (!o) throw new NotFoundException();
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${o.id} FOR UPDATE`;
      const order = await tx.order.findUniqueOrThrow({ where: { id: o.id }, include: { items: true, refunds: true, payments: { orderBy: { createdAt: 'desc' } } } });
      const payment = order.payments.find((p) => p.status === 'SUCCEEDED' || p.status === 'PARTIALLY_REFUNDED');
      if (!payment) throw new AppException(409, 'NOTHING_TO_REFUND', 'This order has no verified payment left to refund.');

      const already = order.refunds.filter((r) => r.paymentId === payment.id && r.status !== 'FAILED').reduce((a, r) => a.add(dec(r.amount)), ZERO);
      const amount = dec(req.amount);
      const remaining = dec(payment.amount).sub(already);
      if (amount.lte(0) || amount.gt(remaining)) {
        throw new AppException(422, 'REFUND_TOO_LARGE', `You can refund up to ${order.currency} ${money(remaining)} on this order.`, [{ field: 'amount', issue: 'Too large' }]);
      }

      const restocked = restockedByVariant(order.refunds);
      for (const line of req.restock) {
        const item = order.items.find((i) => i.variantId === line.variantId);
        const max = (item?.quantity ?? 0) - (restocked.get(line.variantId) ?? 0);
        if (!item || line.quantity < 1 || line.quantity > max) {
          throw new AppException(422, 'RESTOCK_INVALID', `You can return at most ${Math.max(0, max)} of ${item?.productName ?? 'that item'} to stock.`);
        }
      }

      const created = await tx.refund.create({
        data: {
          orderId: order.id,
          paymentId: payment.id,
          amount: money(amount),
          reason: req.reason,
          method: req.method,
          status: req.method === 'MANUAL' ? 'SUCCEEDED' : 'PENDING',
          completedAt: req.method === 'MANUAL' ? new Date() : null,
          restock: req.restock as unknown as Prisma.InputJsonValue,
          idempotencyKey: req.idempotencyKey,
          createdBy: actorId,
        },
      });
      await this.audit.record({ actorId, requestId, action: 'refund.create', resourceType: 'Order', resourceId: order.id, after: { ...req, refundId: created.id } }, tx);
      if (created.status === 'SUCCEEDED') await this.applySucceeded(tx, created.id, actorId);
      else await tx.payment.update({ where: { id: payment.id }, data: { status: 'REFUND_PENDING' } });
      return created;
    });

    if (refund.method === 'PROVIDER') return view(await this.sendToProvider(refund.id, actorId));
    return view(refund);
  }

  private async sendToProvider(refundId: string, actorId: string): Promise<Refund> {
    const r = await this.prisma.refund.findUniqueOrThrow({ where: { id: refundId }, include: { payment: true } });
    let result: RefundResult;
    try {
      result = await this.gateway.refund!({ refundId: r.id, paymentReference: r.payment.reference, providerTransactionId: r.payment.providerTransactionId, amount: money(r.amount), currency: r.payment.currency, reason: r.reason });
    } catch (e) {
      this.logger.error(`Refund ${r.id} failed at provider: ${e}`);
      result = { status: 'FAILED', failureReason: 'The payment provider didn’t accept the refund. Try again, or refund in the Hubtel dashboard and record it.' };
    }
    return this.applyProviderResult(r.id, result, actorId);
  }

  /**
   * Single place that applies a provider answer (first response, poll, callback or staff re-check).
   * Locks the refund row and ignores anything once the refund is final, so repeats are harmless.
   */
  private async applyProviderResult(refundId: string, result: RefundResult, actorId: string): Promise<Refund> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Refund" WHERE id = ${refundId} FOR UPDATE`;
      const cur = await tx.refund.findUniqueOrThrow({ where: { id: refundId } });
      if (cur.status !== 'PENDING') return cur;
      if (result.status === 'PENDING') {
        return result.providerRefundId && result.providerRefundId !== cur.providerRefundId
          ? tx.refund.update({ where: { id: cur.id }, data: { providerRefundId: result.providerRefundId } })
          : cur;
      }
      if (result.status === 'FAILED') {
        const failed = await tx.refund.update({ where: { id: cur.id }, data: { status: 'FAILED', failureReason: result.failureReason ?? 'Refund failed', completedAt: new Date() } });
        await this.syncPaymentStatus(tx, cur.paymentId);
        await this.audit.record({ actorId, action: 'refund.failed', resourceType: 'Refund', resourceId: cur.id, after: { failureReason: failed.failureReason } }, tx);
        return failed;
      }
      await tx.refund.update({ where: { id: cur.id }, data: { status: 'SUCCEEDED', completedAt: new Date(), providerRefundId: result.providerRefundId ?? cur.providerRefundId } });
      await this.applySucceeded(tx, cur.id, actorId);
      return tx.refund.findUniqueOrThrow({ where: { id: cur.id } });
    });
  }

  /** Server-to-server status check for a pending provider refund. Safe to call repeatedly. */
  async recheck(refundId: string, actorId?: string) {
    const r = await this.prisma.refund.findUnique({ where: { id: refundId }, include: { payment: true } });
    if (!r) throw new NotFoundException({ code: 'REFUND_NOT_FOUND', message: 'Refund not found.' });
    if (r.status !== 'PENDING' || r.method !== 'PROVIDER' || !this.gateway.refundStatus) return view(r);
    const result = await this.gateway.refundStatus({ refundId: r.id, providerRefundId: r.providerRefundId, paymentReference: r.payment.reference });
    return view(await this.applyProviderResult(r.id, result, actorId ?? r.createdBy));
  }

  /** Provider refund callback: authenticated by the gateway, then confirmed with refundStatus(). */
  async handleCallback(refundId: string) {
    return this.recheck(refundId);
  }

  /** Polls pending provider refunds every 5 minutes until they succeed or fail. */
  @Interval(5 * 60_000)
  async pollPending() {
    if (this.polling || !this.gateway.refundStatus) return;
    this.polling = true;
    try {
      const pending = await this.prisma.refund.findMany({ where: { status: 'PENDING', method: 'PROVIDER' }, orderBy: { createdAt: 'asc' }, take: 50, select: { id: true } });
      for (const { id } of pending) {
        await this.recheck(id).catch((e) => this.logger.warn(`Refund status check failed for ${id}: ${e}`));
      }
    } finally {
      this.polling = false;
    }
  }

  /** For the admin overview: provider refunds pending longer than a day. */
  stuckCount() {
    return this.prisma.refund.count({ where: { status: 'PENDING', createdAt: { lt: new Date(Date.now() - REFUND_STUCK_AFTER_MS) } } });
  }

  /** Effects of a completed refund: payment/order status, restock, customer email. */
  private async applySucceeded(tx: Tx, refundId: string, actorId: string) {
    const r = await tx.refund.findUniqueOrThrow({ where: { id: refundId }, include: { order: true } });
    const full = await this.syncPaymentStatus(tx, r.paymentId);
    const o = r.order;

    if (full && !['COMPLETED', 'CANCELLED'].includes(o.status)) {
      await tx.order.update({ where: { id: o.id }, data: { status: 'CANCELLED', history: { create: { from: o.status, to: 'CANCELLED', actorId, note: 'Refunded in full' } } } });
    }
    for (const line of (r.restock as RestockLine[] | null) ?? []) {
      await this.inventory.adjust(tx, line.variantId, line.quantity, actorId, `Returned, order ${o.orderNumber}`, 'RETURN');
    }
    if (!o.contactEmail.endsWith('@deleted.invalid')) {
      await this.outbox.enqueue(tx, [{
        channel: 'EMAIL',
        type: 'REFUND_ISSUED',
        recipient: o.contactEmail,
        orderId: o.id,
        idempotencyKey: `refund:${r.id}`,
        payload: {
          storeName: this.config.get('STORE_NAME', { infer: true }),
          orderNumber: o.orderNumber,
          customerName: o.contactName,
          currency: o.currency,
          amount: money(r.amount),
          full,
          method: r.method,
          reason: r.reason,
          orderUrl: `${this.config.get('WEB_URL', { infer: true })}/account/orders/${o.orderNumber}`,
        },
      }]);
    }
  }

  /** Recomputes payment + order payment status from refunds. Returns true when fully refunded. */
  private async syncPaymentStatus(tx: Tx, paymentId: string) {
    const p = await tx.payment.findUniqueOrThrow({ where: { id: paymentId }, include: { refunds: true } });
    const done = p.refunds.filter((r) => r.status === 'SUCCEEDED').reduce((a, r) => a.add(dec(r.amount)), ZERO);
    const pending = p.refunds.some((r) => r.status === 'PENDING');
    const full = done.gte(dec(p.amount));
    const status = full ? 'REFUNDED' : pending ? 'REFUND_PENDING' : done.gt(0) ? 'PARTIALLY_REFUNDED' : 'SUCCEEDED';
    await tx.payment.update({ where: { id: p.id }, data: { status } });
    await tx.order.update({ where: { id: p.orderId }, data: { paymentStatus: status } });
    return full;
  }
}

function restockedByVariant(refunds: Pick<Refund, 'status' | 'restock'>[]) {
  const m = new Map<string, number>();
  for (const r of refunds.filter((x) => x.status !== 'FAILED')) {
    for (const l of (r.restock as RestockLine[] | null) ?? []) m.set(l.variantId, (m.get(l.variantId) ?? 0) + l.quantity);
  }
  return m;
}

const view = (r: Refund) => ({ id: r.id, amount: money(r.amount), status: r.status, method: r.method, failureReason: r.failureReason });
