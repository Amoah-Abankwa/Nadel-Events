import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { IsDateString } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { money } from '../../common/utils/money';

class RangeQuery {
  @IsDateString() from: string; // YYYY-MM-DD inclusive
  @IsDateString() to: string; // YYYY-MM-DD inclusive
}

type Num = { toString(): string } | null;
const n = (v: Num | bigint | number) => (v == null ? 0 : Number(v));
const m = (v: Num) => money(v ?? 0);

/**
 * Sales reports (SRS FR-024). A sale counts on the day its payment was verified (paidAt, UTC = Ghana time).
 * Shop orders and custom-cake deposits are reported separately. Refunds count on the day they completed.
 */
@Roles('ADMIN')
@Controller('admin/reports')
export class AdminReportsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('sales')
  async sales(@Query() q: RangeQuery) {
    const from = new Date(`${q.from.slice(0, 10)}T00:00:00Z`);
    const to = new Date(new Date(`${q.to.slice(0, 10)}T00:00:00Z`).getTime() + 86_400_000);
    if (to <= from) throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'The end date must be on or after the start date.' });
    if (to.getTime() - from.getTime() > 366 * 86_400_000) throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Choose a range of a year or less.' });

    const PAID = ['SUCCEEDED', 'PARTIALLY_REFUNDED', 'REFUNDED'];

    const [daily, totals, deposits, refunds, best, byCategory, coupons, fulfilment, banners, requests] = await Promise.all([
      this.prisma.$queryRaw<{ day: Date; orders: bigint; sales: Num }[]>`
        SELECT date_trunc('day', "paidAt") AS day, count(*)::bigint AS orders, sum(total) AS sales
        FROM "Order" WHERE "paidAt" >= ${from} AND "paidAt" < ${to} AND "paymentStatus"::text = ANY(${PAID}) AND "serviceRequestId" IS NULL
        GROUP BY 1 ORDER BY 1`,
      this.prisma.$queryRaw<{ orders: bigint; sales: Num; discounts: Num; delivery: Num; tax: Num; subtotal: Num }[]>`
        SELECT count(*)::bigint AS orders, sum(total) AS sales, sum("discountTotal") AS discounts, sum("deliveryFee") AS delivery, sum("taxTotal") AS tax, sum(subtotal) AS subtotal
        FROM "Order" WHERE "paidAt" >= ${from} AND "paidAt" < ${to} AND "paymentStatus"::text = ANY(${PAID}) AND "serviceRequestId" IS NULL`,
      this.prisma.$queryRaw<{ n: bigint; sum: Num }[]>`
        SELECT count(*)::bigint AS n, sum(total) AS sum FROM "Order"
        WHERE "paidAt" >= ${from} AND "paidAt" < ${to} AND "paymentStatus"::text = ANY(${PAID}) AND "serviceRequestId" IS NOT NULL`,
      this.prisma.$queryRaw<{ n: bigint; sum: Num }[]>`
        SELECT count(*)::bigint AS n, sum(amount) AS sum FROM "Refund" WHERE status = 'SUCCEEDED' AND "completedAt" >= ${from} AND "completedAt" < ${to}`,
      this.prisma.$queryRaw<{ productId: string; name: string; qty: bigint; revenue: Num }[]>`
        SELECT oi."productId", max(oi."productName") AS name, sum(oi.quantity)::bigint AS qty, sum(oi."lineTotal") AS revenue
        FROM "OrderItem" oi JOIN "Order" o ON o.id = oi."orderId"
        WHERE o."paidAt" >= ${from} AND o."paidAt" < ${to} AND o."paymentStatus"::text = ANY(${PAID}) AND o."serviceRequestId" IS NULL AND oi."productId" IS NOT NULL
        GROUP BY oi."productId" ORDER BY revenue DESC LIMIT 15`,
      this.prisma.$queryRaw<{ category: string; qty: bigint; revenue: Num }[]>`
        SELECT c.name AS category, sum(oi.quantity)::bigint AS qty, sum(oi."lineTotal") AS revenue
        FROM "OrderItem" oi JOIN "Order" o ON o.id = oi."orderId" JOIN "Product" p ON p.id = oi."productId" JOIN "Category" c ON c.id = p."categoryId"
        WHERE o."paidAt" >= ${from} AND o."paidAt" < ${to} AND o."paymentStatus"::text = ANY(${PAID}) AND o."serviceRequestId" IS NULL
        GROUP BY c.name ORDER BY revenue DESC`,
      this.prisma.$queryRaw<{ code: string; uses: bigint; discount: Num; revenue: Num }[]>`
        SELECT c.code, count(r.id)::bigint AS uses, sum(r."discountAmount") AS discount, sum(o.total) AS revenue
        FROM "CouponRedemption" r JOIN "Coupon" c ON c.id = r."couponId" JOIN "Order" o ON o.id = r."orderId"
        WHERE o."paidAt" >= ${from} AND o."paidAt" < ${to} AND o."paymentStatus"::text = ANY(${PAID})
        GROUP BY c.code ORDER BY revenue DESC`,
      this.prisma.$queryRaw<{ type: string; orders: bigint; sales: Num }[]>`
        SELECT "fulfilmentType"::text AS type, count(*)::bigint AS orders, sum(total) AS sales FROM "Order"
        WHERE "paidAt" >= ${from} AND "paidAt" < ${to} AND "paymentStatus"::text = ANY(${PAID}) AND "serviceRequestId" IS NULL
        GROUP BY 1`,
      this.prisma.banner.findMany({ where: { clicks: { gt: 0 } }, select: { title: true, placement: true, clicks: true, isSponsored: true }, orderBy: { clicks: 'desc' }, take: 15 }),
      this.prisma.serviceRequest.groupBy({ by: ['status'], where: { createdAt: { gte: from, lt: to } }, _count: true }),
    ]);

    const t = totals[0];
    const refundSum = refunds[0]?.sum ?? null;
    const net = Number(m(t?.sales ?? null)) + Number(m(deposits[0]?.sum ?? null)) - Number(m(refundSum));

    return {
      range: { from: q.from.slice(0, 10), to: q.to.slice(0, 10) },
      totals: {
        orders: n(t?.orders ?? 0),
        sales: m(t?.sales ?? null),
        averageOrder: n(t?.orders ?? 0) ? money(Number(m(t!.sales)) / n(t!.orders)) : '0.00',
        itemsSubtotal: m(t?.subtotal ?? null),
        discounts: m(t?.discounts ?? null),
        deliveryFees: m(t?.delivery ?? null),
        tax: m(t?.tax ?? null),
        deposits: m(deposits[0]?.sum ?? null),
        depositCount: n(deposits[0]?.n ?? 0),
        refunds: m(refundSum),
        refundCount: n(refunds[0]?.n ?? 0),
        net: money(net),
      },
      daily: daily.map((d) => ({ day: d.day.toISOString().slice(0, 10), orders: n(d.orders), sales: m(d.sales) })),
      bestSellers: best.map((b) => ({ productId: b.productId, name: b.name, quantity: n(b.qty), revenue: m(b.revenue) })),
      byCategory: byCategory.map((c) => ({ category: c.category, quantity: n(c.qty), revenue: m(c.revenue) })),
      coupons: coupons.map((c) => ({ code: c.code, uses: n(c.uses), discount: m(c.discount), revenue: m(c.revenue) })),
      fulfilment: fulfilment.map((f) => ({ type: f.type, orders: n(f.orders), sales: m(f.sales) })),
      bannerClicks: banners,
      serviceRequests: requests.map((r) => ({ status: r.status, count: r._count })),
    };
  }
}
