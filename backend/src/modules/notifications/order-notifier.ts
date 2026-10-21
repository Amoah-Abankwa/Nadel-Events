import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env';
import type { Order, OrderItem, OrderStatus, Prisma } from '../../generated/prisma/client';
import type { Tx } from '../../prisma/transaction';
import { money } from '../../common/utils/money';
import { OutboxService } from './outbox.service';
import type { OrderEmailPayload } from './templates/email-templates';

type OrderWithItems = Order & { items: OrderItem[] };

const json = (v: unknown) => JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;

const CUSTOMER_STATUS_EMAILS: OrderStatus[] = ['PROCESSING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED', 'REFUND_PENDING'];

/** Builds order notifications and writes them to the outbox inside the caller's transaction. */
@Injectable()
export class OrderNotifier {
  constructor(
    private readonly outbox: OutboxService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  placed(tx: Tx, order: OrderWithItems) {
    return this.outbox.enqueue(tx, [
      { channel: 'EMAIL', type: 'ORDER_PLACED', recipient: order.contactEmail, orderId: order.id, idempotencyKey: `order:${order.id}:placed`, payload: json(this.payload(order)) },
    ]);
  }

  paid(tx: Tx, order: OrderWithItems) {
    const owner = this.config.get('OWNER_EMAIL', { infer: true });
    const payload = json(this.payload(order));
    return this.outbox.enqueue(tx, [
      { channel: 'EMAIL', type: 'PAYMENT_CONFIRMED', recipient: order.contactEmail, orderId: order.id, idempotencyKey: `order:${order.id}:paid`, payload },
      ...(owner
        ? [{ channel: 'EMAIL' as const, type: 'OWNER_NEW_ORDER', recipient: owner, orderId: order.id, idempotencyKey: `order:${order.id}:owner-paid`, payload }]
        : []),
    ]);
  }

  statusChanged(tx: Tx, order: OrderWithItems, status: OrderStatus) {
    if (!CUSTOMER_STATUS_EMAILS.includes(status)) return Promise.resolve();
    return this.outbox.enqueue(tx, [
      { channel: 'EMAIL', type: 'ORDER_STATUS_CHANGED', recipient: order.contactEmail, orderId: order.id, idempotencyKey: `order:${order.id}:status:${status}`, payload: json({ ...this.payload(order), status }) },
    ]);
  }

  private payload(o: OrderWithItems): OrderEmailPayload {
    const web = this.config.get('WEB_URL', { infer: true });
    const address = o.shippingAddress as { area?: string } | null;
    return {
      storeName: this.config.get('STORE_NAME', { infer: true }),
      orderNumber: o.orderNumber,
      customerName: o.contactName,
      customerEmail: o.contactEmail,
      customerPhone: o.contactPhone,
      currency: o.currency,
      items: o.items.map((i) => ({ name: i.variantName === 'Standard' ? i.productName : `${i.productName} (${i.variantName})`, quantity: i.quantity, lineTotal: money(i.lineTotal) })),
      subtotal: money(o.subtotal),
      discountTotal: money(o.discountTotal),
      taxTotal: money(o.taxTotal),
      taxLines: (o.taxLines as OrderEmailPayload['taxLines']) ?? [],
      pricesIncludeTax: o.pricesIncludeTax,
      deliveryFee: money(o.deliveryFee),
      total: money(o.total),
      fulfilmentType: o.fulfilmentType,
      deliveryArea: address?.area,
      orderUrl: `${web}/account/orders/${o.orderNumber}`,
      adminUrl: `${web}/admin/orders/${o.orderNumber}`,
    };
  }
}
