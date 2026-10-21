import { Body, Controller, HttpCode, Get, NotFoundException, Param, Patch, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { OrderStatus, PaymentStatus, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { paginate } from '../../common/utils/pagination';
import { AuditService } from '../audit/audit.service';
import { AppException } from '../../common/app.exception';
import { OrderNotifier } from '../notifications/order-notifier';
import { STAFF_SETTABLE, assertTransition, canTransition } from '../orders/order-state';
import { PaymentProcessor } from '../payments/payment-processor.service';
import { RefundsService } from '../payments/refunds.service';
import { AdminOrderQuery, OrderStatusDto, RefundDto } from './admin.dto';

@Controller('admin')
export class AdminOrdersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifier: OrderNotifier,
    private readonly processor: PaymentProcessor,
    private readonly refunds: RefundsService,
  ) {}

  @Roles('ADMIN') @Get('orders/:orderNumber/refunds')
  refundSummary(@Param('orderNumber') orderNumber: string) {
    return this.refunds.summary(orderNumber);
  }

  /** Ask the provider for the latest status of a pending refund. */
  @Roles('ADMIN') @HttpCode(200) @Post('refunds/:id/recheck')
  recheckRefund(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.refunds.recheck(id, user.id);
  }

  /** Requires a client idempotency key so a double-click can't refund twice. */
  @Roles('ADMIN') @Post('orders/:orderNumber/refunds')
  refund(@Param('orderNumber') orderNumber: string, @Body() dto: RefundDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.refunds.create(orderNumber, { ...dto, restock: dto.restock ?? [] }, user.id, req.requestId);
  }

  @Roles('FULFILMENT')
  @Get('orders')
  async list(@Query() q: AdminOrderQuery) {
    const where: Prisma.OrderWhereInput = {
      ...(q.status ? { status: q.status as OrderStatus } : {}),
      ...(q.paymentStatus ? { paymentStatus: q.paymentStatus as PaymentStatus } : {}),
      ...(q.fulfilmentType ? { fulfilmentType: q.fulfilmentType } : {}),
      ...(q.needsReconciliation != null ? { needsReconciliation: q.needsReconciliation } : {}),
      ...(q.q ? { OR: [{ orderNumber: { contains: q.q, mode: 'insensitive' as const } }, { contactEmail: { contains: q.q, mode: 'insensitive' as const } }] } : {}),
      ...(q.from || q.to ? { placedAt: { ...(q.from ? { gte: new Date(q.from) } : {}), ...(q.to ? { lte: new Date(q.to) } : {}) } } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.order.findMany({ where, orderBy: { placedAt: 'desc' }, skip: (q.page - 1) * q.limit, take: q.limit, include: { serviceRequest: { select: { reference: true } } } }),
      this.prisma.order.count({ where }),
    ]);
    return paginate(items, total, q);
  }

  @Roles('FULFILMENT')
  @Get('orders/:orderNumber')
  async get(@Param('orderNumber') orderNumber: string) {
    const o = await this.prisma.order.findUnique({ where: { orderNumber }, include: { items: true, payments: true, history: { orderBy: { createdAt: 'asc' } }, serviceRequest: { select: { reference: true } } } });
    if (!o) throw new NotFoundException();
    const allowedNext = o.serviceRequestId ? [] : STAFF_SETTABLE.filter((s) => canTransition(o.status, s, o.fulfilmentType));
    return { ...o, allowedNext };
  }

  @Roles('FULFILMENT')
  @Patch('orders/:orderNumber/status')
  async setStatus(@Param('orderNumber') orderNumber: string, @Body() dto: OrderStatusDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.prisma.$transaction(async (tx) => {
      const o = await tx.order.findUnique({ where: { orderNumber } });
      if (!o) throw new NotFoundException();
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${o.id} FOR UPDATE`;
      const fresh = await tx.order.findUniqueOrThrow({ where: { id: o.id } });
      if (fresh.serviceRequestId) throw new AppException(409, 'DEPOSIT_ORDER', 'This is a deposit payment. Manage it from the request instead.');
      assertTransition(fresh.status, dto.status, fresh.fulfilmentType);
      const updated = await tx.order.update({
        where: { id: o.id },
        data: { status: dto.status, ...(dto.status === 'COMPLETED' ? { completedAt: new Date() } : {}), history: { create: { from: fresh.status, to: dto.status, actorId: user.id, note: dto.note } } },
        include: { items: true },
      });
      await this.notifier.statusChanged(tx, updated, dto.status);
      await this.audit.record({ actorId: user.id, requestId: req.requestId, action: 'order.status', resourceType: 'Order', resourceId: o.id, before: { status: fresh.status }, after: { status: dto.status, note: dto.note } }, tx);
      return { orderNumber, status: updated.status };
    });
  }

  /** Re-verifies with the provider; for stuck or disputed payments (SRS 8.4). */
  @Roles('ADMIN')
  @Post('payments/:reference/reconcile')
  async reconcile(@Param('reference') reference: string, @CurrentUser() user: AuthUser, @Req() req: Request) {
    const p = await this.processor.reconcile(reference, { actorId: user.id, requestId: req.requestId });
    await this.audit.record({ actorId: user.id, requestId: req.requestId, action: 'payment.reconcile_requested', resourceType: 'Payment', resourceId: p.id, after: { status: p.status } });
    return { reference: p.reference, status: p.status };
  }

  @Roles('ADMIN')
  @Patch('orders/:orderNumber/reconciled')
  async clearReconciliation(@Param('orderNumber') orderNumber: string, @CurrentUser() user: AuthUser, @Req() req: Request) {
    const o = await this.prisma.order.update({ where: { orderNumber }, data: { needsReconciliation: false } });
    await this.audit.record({ actorId: user.id, requestId: req.requestId, action: 'order.reconciliation_cleared', resourceType: 'Order', resourceId: o.id });
    return { orderNumber, needsReconciliation: false };
  }
}
