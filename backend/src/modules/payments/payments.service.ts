import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env';
import { PrismaService } from '../../prisma/prisma.service';
import { AppException } from '../../common/app.exception';
import { money } from '../../common/utils/money';
import { PAYMENT_GATEWAY, PaymentGateway } from './gateways/payment-gateway';

export interface PaymentStart {
  reference: string;
  checkoutUrl: string;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
  ) {}

  /** Starts (or resumes) payment for a pending order owned by userId. Safe to call repeatedly. */
  async initiate(orderNumber: string, userId: string): Promise<PaymentStart> {
    const order = await this.prisma.order.findFirst({
      where: { orderNumber, userId },
      include: { payments: { orderBy: { createdAt: 'desc' } } },
    });
    if (!order) throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Order not found.' });
    if (order.status !== 'PENDING_PAYMENT') {
      throw new AppException(409, 'ORDER_NOT_PAYABLE', 'This order is no longer waiting for payment.');
    }
    if (order.reservationExpiresAt && order.reservationExpiresAt < new Date()) {
      throw new AppException(409, 'ORDER_EXPIRED', 'The payment window for this order has closed. Reorder to try again.');
    }

    let payment = order.payments.find((p) => p.status === 'CREATED' || p.status === 'PENDING');
    if (payment?.status === 'PENDING' && payment.checkoutUrl) {
      return { reference: payment.reference, checkoutUrl: payment.checkoutUrl };
    }
    payment ??= await this.prisma.payment.create({
      data: {
        orderId: order.id,
        provider: this.gateway.name,
        reference: `${order.orderNumber}-P${order.payments.length + 1}`,
        amount: order.total,
        currency: order.currency,
      },
    });

    const web = this.config.get('WEB_URL', { infer: true });
    const api = this.config.get('API_URL', { infer: true });
    const result = await this.gateway.initiate({
      reference: payment.reference,
      amount: money(order.total),
      currency: order.currency,
      description: `Order ${order.orderNumber}`,
      customer: { name: order.contactName, email: order.contactEmail, phone: order.contactPhone },
      returnUrl: `${web}/checkout/result?order=${encodeURIComponent(order.orderNumber)}`,
      cancelUrl: `${web}/checkout/result?order=${encodeURIComponent(order.orderNumber)}&cancelled=1`,
      callbackUrl: `${api}/api/v1/payments/${this.gateway.name}/callback`,
    });

    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'PENDING', checkoutUrl: result.checkoutUrl, providerTransactionId: result.providerReference },
      }),
      this.prisma.order.update({ where: { id: order.id }, data: { paymentStatus: 'PENDING' } }),
    ]);
    return { reference: payment.reference, checkoutUrl: result.checkoutUrl };
  }
}
