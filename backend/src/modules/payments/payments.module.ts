import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env';
import { PrismaService } from '../../prisma/prisma.service';
import { CouponService } from '../checkout/coupon.service';
import { HubtelGateway } from './gateways/hubtel.gateway';
import { MockGateway } from './gateways/mock.gateway';
import { PAYMENT_GATEWAY } from './gateways/payment-gateway';
import { PaymentProcessor } from './payment-processor.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { RefundsService } from './refunds.service';

@Module({
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PaymentProcessor,
    RefundsService,
    CouponService,
    {
      provide: PAYMENT_GATEWAY,
      inject: [ConfigService, PrismaService],
      useFactory: (config: ConfigService<Env, true>, prisma: PrismaService) =>
        config.get('PAYMENT_PROVIDER', { infer: true }) === 'hubtel' ? new HubtelGateway(config) : new MockGateway(prisma),
    },
  ],
  exports: [PaymentsService, PaymentProcessor, RefundsService, CouponService],
})
export class PaymentsModule {}
