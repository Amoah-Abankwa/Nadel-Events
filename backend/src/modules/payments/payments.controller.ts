import { Body, Controller, ForbiddenException, Get, HttpCode, Inject, NotFoundException, Param, Post, Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IsIn, IsString, Length } from 'class-validator';
import type { Request } from 'express';
import type { Env } from '../../config/env';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { PAYMENT_GATEWAY, PaymentGateway } from './gateways/payment-gateway';
import { MockGateway } from './gateways/mock.gateway';
import { PaymentProcessor } from './payment-processor.service';
import { PaymentsService } from './payments.service';
import { RefundsService } from './refunds.service';

class InitiateDto {
  @IsString() @Length(4, 40)
  orderNumber: string;
}

class MockCompleteDto {
  @IsIn(['SUCCEEDED', 'FAILED'])
  outcome: 'SUCCEEDED' | 'FAILED';
}

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
    private readonly processor: PaymentProcessor,
    private readonly config: ConfigService<Env, true>,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
    private readonly refunds: RefundsService,
  ) {}

  /** Provider → API refund notification. Authenticated by the gateway, deduplicated, then re-checked server-side. */
  @Public() @HttpCode(200) @Post(':provider/refund-callback')
  async refundCallback(@Param('provider') provider: string, @Req() req: Request) {
    if (provider !== this.gateway.name || !this.gateway.parseRefundCallback) throw new NotFoundException();
    const evt = await this.gateway.parseRefundCallback({ headers: req.headers, body: req.body, rawBody: req.rawBody });
    const record = await this.prisma.paymentEvent.upsert({
      where: { provider_eventId: { provider, eventId: `refund:${evt.eventId}` } },
      create: { provider, eventId: `refund:${evt.eventId}`, paymentReference: `refund:${evt.refundId}`, payload: evt.redactedPayload as Prisma.InputJsonValue },
      update: {},
    });
    if (record.processedAt) return { received: true, duplicate: true };
    await this.refunds.handleCallback(evt.refundId);
    await this.prisma.paymentEvent.update({ where: { id: record.id }, data: { processedAt: new Date() } });
    return { received: true };
  }

  /** Start or resume payment for one of the caller's pending orders. */
  @Post('initiate')
  initiate(@Body() dto: InitiateDto, @CurrentUser() user: AuthUser) {
    return this.payments.initiate(dto.orderNumber, user.id);
  }

  /** Provider → API. Authenticated by the gateway, deduplicated, then verified server-side. */
  @Public() @HttpCode(200) @Post(':provider/callback')
  async callback(@Param('provider') provider: string, @Req() req: Request) {
    if (provider !== this.gateway.name) throw new NotFoundException();
    const evt = await this.gateway.parseCallback({ headers: req.headers, body: req.body, rawBody: req.rawBody });

    const record = await this.prisma.paymentEvent.upsert({
      where: { provider_eventId: { provider, eventId: evt.eventId } },
      create: { provider, eventId: evt.eventId, paymentReference: evt.reference, payload: evt.redactedPayload as Prisma.InputJsonValue },
      update: {},
    });
    if (record.processedAt) return { received: true, duplicate: true };

    await this.processor.reconcile(evt.reference, { requestId: req.requestId });
    await this.prisma.paymentEvent.update({ where: { id: record.id }, data: { processedAt: new Date() } });
    return { received: true };
  }

  /** Customer-facing status. Also nudges verification so the result page doesn't wait on a slow callback. */
  @Get(':reference/status')
  async status(@Param('reference') reference: string, @CurrentUser() user: AuthUser) {
    const payment = await this.prisma.payment.findUnique({ where: { reference }, include: { order: { select: { userId: true } } } });
    if (!payment || payment.order.userId !== user.id) throw new NotFoundException({ code: 'PAYMENT_NOT_FOUND', message: 'Payment not found.' });
    const p = await this.processor.reconcile(reference).catch(() => payment);
    return { reference: p.reference, status: p.status, amount: p.amount.toString(), currency: p.currency };
  }

  /** DEV ONLY: simulate the provider outcome for the mock gateway. */
  @Post('mock/:reference/complete')
  async mockComplete(@Param('reference') reference: string, @Body() dto: MockCompleteDto, @CurrentUser() user: AuthUser) {
    if (!(this.gateway instanceof MockGateway) || this.config.get('NODE_ENV', { infer: true }) === 'production') {
      throw new ForbiddenException();
    }
    const payment = await this.prisma.payment.findUnique({ where: { reference }, include: { order: { select: { userId: true, orderNumber: true } } } });
    if (!payment || payment.order.userId !== user.id) throw new NotFoundException();
    this.gateway.setOutcome(reference, dto.outcome);
    const p = await this.processor.reconcile(reference);
    return { status: p.status, orderNumber: payment.order.orderNumber };
  }
}
