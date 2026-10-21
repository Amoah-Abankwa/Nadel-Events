import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import type { OrderStatus, Payment, PaymentStatus } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { Tx } from '../../prisma/transaction';
import { dec } from '../../common/utils/money';
import { AuditService } from '../audit/audit.service';
import { InventoryService } from '../inventory/inventory.service';
import { CouponService } from '../checkout/coupon.service';
import { OrderNotifier } from '../notifications/order-notifier';
import { ServiceNotifier } from '../notifications/service-notifier';
import { PAYMENT_GATEWAY, PaymentGateway } from './gateways/payment-gateway';

const FINAL: PaymentStatus[] = ['SUCCEEDED', 'FAILED', 'REFUND_PENDING', 'REFUNDED', 'PARTIALLY_REFUNDED'];

export interface ReconcileContext {
  actorId?: string;
  requestId?: string;
}

/**
 * The only place that moves money-related state. Every path (callback, return page, expiry job,
 * admin reconcile) goes through reconcile(), which verifies with the provider server-side and
 * is idempotent under concurrent and repeated calls (SRS 9.2, 12.1).
 */
@Injectable()
export class PaymentProcessor {
  private readonly logger = new Logger(PaymentProcessor.name);
  private expiring = false;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
    private readonly inventory: InventoryService,
    private readonly coupons: CouponService,
    private readonly notifier: OrderNotifier,
    private readonly serviceNotifier: ServiceNotifier,
    private readonly audit: AuditService,
  ) {}

  async reconcile(reference: string, ctx: ReconcileContext = {}): Promise<Payment> {
    const payment = await this.prisma.payment.findUnique({ where: { reference } });
    if (!payment) throw new NotFoundException({ code: 'PAYMENT_NOT_FOUND', message: 'Payment not found.' });
    if (FINAL.includes(payment.status) || payment.status === 'CREATED') return payment;

    const result = await this.gateway.verify(reference);
    if (result.status === 'PENDING') return payment;

    return this.prisma.$transaction(async (tx) => {
      // Row lock serialises concurrent callbacks/polls for the same payment.
      await tx.$queryRaw`SELECT id FROM "Payment" WHERE id = ${payment.id} FOR UPDATE`;
      const current = await tx.payment.findUniqueOrThrow({ where: { id: payment.id }, include: { order: { include: { items: true } } } });
      if (FINAL.includes(current.status)) return current;
      const order = current.order;

      if (result.status === 'FAILED') {
        const updated = await tx.payment.update({ where: { id: current.id }, data: { status: 'FAILED', failureReason: result.failureReason?.slice(0, 500), verifiedAt: new Date() } });
        if (order.status === 'PENDING_PAYMENT') {
          await this.closeUnpaid(tx, order.id, order.status, 'PAYMENT_FAILED', 'FAILED', ctx.actorId, 'Payment failed');
        }
        return updated;
      }

      // SUCCEEDED: never trust it unless amount and currency match what we asked for.
      if (!dec(result.amount).eq(dec(current.amount)) || result.currency !== current.currency) {
        await tx.order.update({ where: { id: order.id }, data: { needsReconciliation: true } });
        await this.audit.record({ ...ctx, action: 'payment.amount_mismatch', resourceType: 'Payment', resourceId: current.id, after: { expected: current.amount.toString(), got: result.amount, currency: result.currency } }, tx);
        this.logger.error(`Amount mismatch on payment ${reference}; flagged for manual reconciliation`);
        return current;
      }

      const updated = await tx.payment.update({
        where: { id: current.id },
        data: { status: 'SUCCEEDED', verifiedAt: new Date(), providerTransactionId: result.providerTransactionId },
      });

      if (order.status === 'PENDING_PAYMENT') {
        const paid = await tx.order.update({
          where: { id: order.id },
          data: { status: 'PAID', paymentStatus: 'SUCCEEDED', paidAt: new Date(), history: { create: { from: order.status, to: 'PAID', actorId: ctx.actorId, note: `Verified payment ${reference}` } } },
          include: { items: true },
        });
        await this.inventory.consume(tx, order.id);
        if (paid.serviceRequestId) await this.confirmDeposit(tx, paid.id, paid.serviceRequestId, ctx);
        else await this.notifier.paid(tx, paid);
      } else {
        // Paid after the order expired or was cancelled. Stock may be gone, so a person decides (refund or fulfil).
        await tx.order.update({ where: { id: order.id }, data: { paymentStatus: 'SUCCEEDED', needsReconciliation: true } });
        await this.audit.record({ ...ctx, action: 'payment.late_success', resourceType: 'Order', resourceId: order.id, after: { orderStatus: order.status, reference } }, tx);
        this.logger.warn(`Late payment ${reference} for ${order.orderNumber} (${order.status}); flagged for staff`);
      }

      if (ctx.actorId) {
        await this.audit.record({ ...ctx, action: 'payment.reconciled', resourceType: 'Payment', resourceId: current.id, after: { status: 'SUCCEEDED' } }, tx);
      }
      return updated;
    });
  }

  /** Deposit for a custom-cake/event request verified: the request becomes a confirmed booking. */
  private async confirmDeposit(tx: Tx, orderId: string, requestId: string, ctx: ReconcileContext) {
    await tx.$queryRaw`SELECT id FROM "ServiceRequest" WHERE id = ${requestId} FOR UPDATE`;
    const r = await tx.serviceRequest.findUniqueOrThrow({ where: { id: requestId } });
    if (r.status !== 'ACCEPTED') {
      // Cancelled or re-quoted while the customer was paying: a person decides (refund or reinstate).
      await tx.order.update({ where: { id: orderId }, data: { needsReconciliation: true } });
      await this.audit.record({ ...ctx, action: 'deposit.unexpected', resourceType: 'ServiceRequest', resourceId: r.id, after: { status: r.status, orderId } }, tx);
      return;
    }
    const updated = await tx.serviceRequest.update({
      where: { id: requestId },
      data: { status: 'CONFIRMED', depositPaidAt: new Date() },
      include: { service: true, user: { select: { name: true, email: true } } },
    });
    // Deposit orders have nothing to prepare; close them so they don't sit in the fulfilment queue.
    await tx.order.update({ where: { id: orderId }, data: { status: 'COMPLETED', completedAt: new Date(), history: { create: { from: 'PAID', to: 'COMPLETED', note: `Deposit for ${r.reference}` } } } });
    await this.serviceNotifier.depositPaid(tx, updated);
  }

  /** Moves an unpaid order to a closed state and gives back its stock and coupon use. */
  async closeUnpaid(tx: Tx, orderId: string, from: OrderStatus, to: OrderStatus, paymentStatus: PaymentStatus, actorId: string | undefined, note: string) {
    await tx.order.update({
      where: { id: orderId },
      data: { status: to, paymentStatus, history: { create: { from, to, actorId, note } } },
    });
    if (paymentStatus !== 'FAILED') {
      await tx.payment.updateMany({ where: { orderId, status: { in: ['CREATED', 'PENDING'] } }, data: { status: paymentStatus } });
    }
    await this.inventory.release(tx, orderId, note);
    await this.coupons.release(tx, orderId);
  }

  /** Expires unpaid orders whose reservation window has passed (after one last verification). */
  @Interval(30_000)
  async expireStaleOrders() {
    if (this.expiring) return;
    this.expiring = true;
    try {
      const stale = await this.prisma.order.findMany({
        where: { status: 'PENDING_PAYMENT', reservationExpiresAt: { lt: new Date() } },
        include: { payments: { where: { status: 'PENDING' } } },
        take: 50,
      });
      for (const order of stale) {
        for (const p of order.payments) {
          await this.reconcile(p.reference).catch((e) => this.logger.warn(`Verify before expiry failed for ${p.reference}: ${e}`));
        }
        await this.prisma.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${order.id} FOR UPDATE`;
          const fresh = await tx.order.findUniqueOrThrow({ where: { id: order.id } });
          if (fresh.status !== 'PENDING_PAYMENT') return;
          await this.closeUnpaid(tx, order.id, fresh.status, 'EXPIRED', 'EXPIRED', undefined, 'Payment window expired');
        });
      }
    } catch (e) {
      this.logger.error(e);
    } finally {
      this.expiring = false;
    }
  }
}
