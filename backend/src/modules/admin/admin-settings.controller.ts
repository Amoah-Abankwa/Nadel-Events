import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { PageQuery, paginate } from '../../common/utils/pagination';
import { AuditService } from '../audit/audit.service';
import { RefundsService } from '../payments/refunds.service';
import { ContactService } from '../contact/contact.module';
import { AppException } from '../../common/app.exception';
import { CouponDto, DeliveryZoneDto, OutboxQuery } from './admin.dto';

function checkCoupon(dto: CouponDto) {
  const v = Number(dto.value);
  const bad = (field: string, issue: string) => new AppException(400, 'VALIDATION_ERROR', issue, [{ field, issue }]);
  if (!(v > 0)) throw bad('value', 'The discount must be more than 0.');
  if (dto.discountType === 'PERCENT' && v > 100) throw bad('value', 'A percentage discount can’t be more than 100.');
  if (dto.startsAt && dto.endsAt && new Date(dto.endsAt) <= new Date(dto.startsAt)) throw bad('endsAt', 'The end must be after the start.');
}

@Controller('admin')
export class AdminSettingsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly refunds: RefundsService,
    private readonly contact: ContactService,
  ) {}

  // ----- delivery zones -----
  @Roles('ADMIN') @Get('delivery-zones')
  zones() {
    return this.prisma.deliveryZone.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  @Roles('ADMIN') @Post('delivery-zones')
  async createZone(@Body() dto: DeliveryZoneDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    const z = await this.prisma.deliveryZone.create({ data: dto });
    await this.audit.record({ actorId: user.id, requestId: req.requestId, action: 'delivery_zone.create', resourceType: 'DeliveryZone', resourceId: z.id, after: dto });
    return z;
  }

  @Roles('ADMIN') @Patch('delivery-zones/:id')
  async updateZone(@Param('id') id: string, @Body() dto: DeliveryZoneDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    const before = await this.prisma.deliveryZone.findUniqueOrThrow({ where: { id } });
    const z = await this.prisma.deliveryZone.update({ where: { id }, data: dto });
    await this.audit.record({ actorId: user.id, requestId: req.requestId, action: 'delivery_zone.update', resourceType: 'DeliveryZone', resourceId: id, before, after: z });
    return z;
  }

  // ----- coupons -----
  @Roles('MARKETING') @Get('coupons')
  coupons() {
    return this.prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
  }

  @Roles('MARKETING') @Post('coupons')
  async createCoupon(@Body() dto: CouponDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    checkCoupon(dto);
    const c = await this.prisma.coupon.create({ data: { ...dto, productIds: dto.productIds ?? [], categoryIds: dto.categoryIds ?? [] } });
    await this.audit.record({ actorId: user.id, requestId: req.requestId, action: 'coupon.create', resourceType: 'Coupon', resourceId: c.id, after: dto });
    return c;
  }

  @Roles('MARKETING') @Patch('coupons/:id')
  async updateCoupon(@Param('id') id: string, @Body() dto: CouponDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    checkCoupon(dto);
    const before = await this.prisma.coupon.findUniqueOrThrow({ where: { id } });
    const c = await this.prisma.coupon.update({ where: { id }, data: dto });
    await this.audit.record({ actorId: user.id, requestId: req.requestId, action: 'coupon.update', resourceType: 'Coupon', resourceId: id, before, after: c });
    return c;
  }

  // ----- operations -----
  @Roles('ADMIN') @Get('notifications')
  async notifications(@Query() q: OutboxQuery) {
    const where = q.status ? { status: q.status } : {};
    const [items, total] = await Promise.all([
      this.prisma.outboxEvent.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (q.page - 1) * q.limit, take: q.limit, omit: { payload: true } }),
      this.prisma.outboxEvent.count({ where }),
    ]);
    return paginate(items, total, q);
  }

  @Roles('ADMIN') @Post('notifications/:id/retry')
  retry(@Param('id') id: string) {
    return this.prisma.outboxEvent.update({ where: { id }, data: { status: 'PENDING', attempts: 0, nextAttemptAt: new Date(), lastError: null } });
  }

  @Roles('ADMIN') @Get('audit-logs')
  async auditLogs(@Query() q: PageQuery) {
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, skip: (q.page - 1) * q.limit, take: q.limit }),
      this.prisma.auditLog.count(),
    ]);
    return paginate(items, total, q);
  }

  /** Dashboard overview. Ghana is UTC+0, so "today" is the UTC calendar day. */
  @Roles('FULFILMENT') @Get('reports/summary')
  async summary() {
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const [paidToday, pendingPayment, toFulfil, inProgress, needsReconciliation, lowStock, deadNotifications, newRequests, pendingReviews] = await Promise.all([
      this.prisma.order.aggregate({ where: { paidAt: { gte: today }, paymentStatus: 'SUCCEEDED' }, _count: true, _sum: { total: true } }),
      this.prisma.order.count({ where: { status: 'PENDING_PAYMENT' } }),
      this.prisma.order.count({ where: { status: { in: ['PAID', 'PROCESSING'] }, serviceRequestId: null } }),
      this.prisma.order.count({ where: { status: { in: ['READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERY_EXCEPTION'] } } }),
      this.prisma.order.count({ where: { needsReconciliation: true } }),
      this.prisma.$queryRaw<{ n: bigint }[]>`
        SELECT count(*)::bigint AS n FROM "ProductVariant" v JOIN "Product" p ON p.id = v."productId"
        WHERE v."trackStock" AND v."isActive" AND p.status = 'PUBLISHED' AND v."stockOnHand" - v."stockReserved" <= 5`,
      this.prisma.outboxEvent.count({ where: { status: 'DEAD' } }),
      this.prisma.serviceRequest.count({ where: { status: 'SUBMITTED' } }),
      this.prisma.review.count({ where: { status: 'PENDING' } }),
    ]);
    return {
      paidOrdersToday: paidToday._count,
      salesToday: (paidToday._sum.total ?? 0).toString(),
      pendingPayment,
      toFulfil,
      inProgress,
      needsReconciliation,
      lowStock: Number(lowStock[0]?.n ?? 0),
      deadNotifications,
      newRequests,
      pendingReviews,
      refundsStuck: await this.refunds.stuckCount(),
      newMessages: await this.contact.countNew(),
    };
  }

  @Roles('ADMIN') @Get('reports/low-stock')
  lowStock() {
    return this.prisma.$queryRaw`
      SELECT v.id, v.sku, p.name, v."stockOnHand", v."stockReserved"
      FROM "ProductVariant" v JOIN "Product" p ON p.id = v."productId"
      WHERE v."trackStock" AND v."isActive" AND p.status = 'PUBLISHED' AND v."stockOnHand" - v."stockReserved" <= 5
      ORDER BY v."stockOnHand" - v."stockReserved" ASC LIMIT 100`;
  }
}
