import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AppException } from '../../common/app.exception';
import { money } from '../../common/utils/money';
import { PageQuery, paginate } from '../../common/utils/pagination';
import { PaymentProcessor } from '../payments/payment-processor.service';
import { SettingsService } from '../settings/settings.service';
import { workingDayDeadline } from '../../common/utils/working-days';
import type { Order, OrderItem, OrderStatusHistory } from '../../generated/prisma/client';

const notFound = () => new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Order not found.' });

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly processor: PaymentProcessor,
    private readonly settings: SettingsService,
  ) {}

  async listMine(userId: string, q: PageQuery) {
    const where = { userId };
    const [rows, total] = await Promise.all([
      this.prisma.order.findMany({ where, orderBy: { placedAt: 'desc' }, skip: (q.page - 1) * q.limit, take: q.limit, include: { items: true, serviceRequest: { select: { reference: true } } } }),
      this.prisma.order.count({ where }),
    ]);
    return paginate(rows.map((o) => summary(o)), total, q);
  }

  /** Ownership is part of the lookup, so other customers' order numbers return 404 (no enumeration). */
  async getMine(userId: string, orderNumber: string) {
    const o = await this.prisma.order.findFirst({
      where: { orderNumber, userId },
      include: { items: true, history: { orderBy: { createdAt: 'asc' } }, serviceRequest: { select: { reference: true } } },
    });
    if (!o) throw notFound();
    const { publicHolidays } = await this.settings.get();
    return detail(o, publicHolidays);
  }

  async status(userId: string, orderNumber: string) {
    const o = await this.prisma.order.findFirst({ where: { orderNumber, userId }, include: { payments: { orderBy: { createdAt: 'desc' }, take: 1 }, serviceRequest: { select: { reference: true } } } });
    if (!o) throw notFound();
    const latest = o.payments[0];
    if (latest?.status === 'PENDING') {
      await this.processor.reconcile(latest.reference).catch(() => undefined);
      return this.statusAfterReconcile(userId, orderNumber);
    }
    return statusView(o);
  }

  private async statusAfterReconcile(userId: string, orderNumber: string) {
    const o = await this.prisma.order.findFirstOrThrow({ where: { orderNumber, userId }, include: { serviceRequest: { select: { reference: true } } } });
    return statusView(o);
  }

  async cancel(userId: string, orderNumber: string) {
    return this.prisma.$transaction(async (tx) => {
      const o = await tx.order.findFirst({ where: { orderNumber, userId } });
      if (!o) throw notFound();
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${o.id} FOR UPDATE`;
      const fresh = await tx.order.findUniqueOrThrow({ where: { id: o.id } });
      if (fresh.status !== 'PENDING_PAYMENT') {
        throw new AppException(409, 'ORDER_NOT_CANCELLABLE', 'Paid orders cannot be cancelled online. Contact us for help.');
      }
      await this.processor.closeUnpaid(tx, o.id, fresh.status, 'CANCELLED', 'EXPIRED', userId, 'Cancelled by customer');
      return { orderNumber, status: 'CANCELLED' as const };
    });
  }

  /** Returns cart lines for still-available items; the client re-validates prices and stock. */
  async reorder(userId: string, orderNumber: string) {
    const o = await this.prisma.order.findFirst({ where: { orderNumber, userId }, include: { items: { include: { variant: { include: { product: true } } } } } });
    if (!o) throw notFound();
    const lines = o.items
      .filter((i) => i.variant?.isActive && i.variant.product.status === 'PUBLISHED')
      .map((i) => ({ variantId: i.variantId!, quantity: i.quantity }));
    return { lines, skipped: o.items.length - lines.length };
  }
}

function statusView(o: Order & { serviceRequest?: { reference: string } | null }) {
  return {
    orderNumber: o.orderNumber,
    serviceRequestReference: o.serviceRequest?.reference ?? null,
    status: o.status,
    paymentStatus: o.paymentStatus,
    fulfilmentType: o.fulfilmentType,
    total: money(o.total),
    currency: o.currency,
    reservationExpiresAt: o.reservationExpiresAt,
  };
}

function summary(o: Order & { items: OrderItem[]; serviceRequest?: { reference: string } | null }) {
  return {
    ...statusView(o),
    placedAt: o.placedAt,
    itemCount: o.items.reduce((n, i) => n + i.quantity, 0),
    firstItemName: o.items[0]?.productName ?? null,
  };
}

function detail(o: Order & { items: OrderItem[]; history: OrderStatusHistory[]; serviceRequest?: { reference: string } | null }, holidays: string[]) {
  const now = new Date();
  return {
    ...statusView(o),
    placedAt: o.placedAt,
    paidAt: o.paidAt,
    subtotal: money(o.subtotal),
    discountTotal: money(o.discountTotal),
    taxTotal: money(o.taxTotal),
    taxLines: o.taxLines ?? [],
    pricesIncludeTax: o.pricesIncludeTax,
    deliveryFee: money(o.deliveryFee),
    couponCode: o.couponCode,
    completedAt: o.completedAt,
    deliveryZoneName: o.deliveryZoneName,
    shippingAddress: o.shippingAddress,
    contactPhone: o.contactPhone,
    notes: o.notes,
    items: o.items.map((i) => {
      // Returns clock starts when the order is completed (picked up / delivered).
      const deadline = o.completedAt ? workingDayDeadline(o.completedAt, i.returnWindowDays, holidays) : null;
      return {
      productName: i.productName,
      variantName: i.variantName,
      sku: i.sku,
      imageUrl: i.imageUrl,
      unitPrice: money(i.unitPrice),
      quantity: i.quantity,
      lineTotal: money(i.lineTotal),
      returnWindowDays: i.returnWindowDays,
      returnDeadline: deadline,
      returnable: Boolean(deadline && deadline > now),
      };
    }),
    history: o.history.map((h) => ({ status: h.to, at: h.createdAt })),
  };
}
