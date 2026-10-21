import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { money } from '../../../common/utils/money';
import type { CallbackInput, InitiateInput, InitiateResult, ParsedCallback, PaymentGateway, RefundInput, RefundResult, RefundStatusInput, VerifyResult } from './payment-gateway';

/**
 * Development-only gateway. Checkout redirects to the storefront's /checkout/mock-pay page,
 * which calls POST /payments/mock/:reference/complete. That endpoint sets the outcome here and runs
 * the same reconcile() path a real callback uses.
 */
@Injectable()
export class MockGateway implements PaymentGateway {
  readonly name = 'mock';
  readonly supportsRefunds = true;
  private readonly outcomes = new Map<string, 'SUCCEEDED' | 'FAILED'>();

  constructor(private readonly prisma: PrismaService) {}

  async initiate(input: InitiateInput): Promise<InitiateResult> {
    const url = new URL(input.returnUrl);
    const mock = new URL('/checkout/mock-pay', url.origin);
    mock.searchParams.set('reference', input.reference);
    mock.searchParams.set('amount', input.amount);
    mock.searchParams.set('currency', input.currency);
    mock.searchParams.set('return', input.returnUrl);
    return { checkoutUrl: mock.toString(), providerReference: `mock_${input.reference}` };
  }

  setOutcome(reference: string, outcome: 'SUCCEEDED' | 'FAILED') {
    this.outcomes.set(reference, outcome);
  }

  async verify(reference: string): Promise<VerifyResult> {
    const p = await this.prisma.payment.findUniqueOrThrow({ where: { reference } });
    const status = this.outcomes.get(reference) ?? 'PENDING';
    return {
      status,
      amount: money(p.amount),
      currency: p.currency,
      providerTransactionId: status === 'SUCCEEDED' ? `mock_tx_${reference}` : undefined,
      failureReason: status === 'FAILED' ? 'Declined in mock gateway' : undefined,
    };
  }

  async refundStatus(input: RefundStatusInput): Promise<RefundResult> {
    return { status: 'SUCCEEDED', providerRefundId: input.providerRefundId ?? `mock_refund_${input.refundId}` };
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    return { status: 'SUCCEEDED', providerRefundId: `mock_refund_${input.refundId}` };
  }

  async parseCallback(_input: CallbackInput): Promise<ParsedCallback> {
    throw new UnauthorizedException('The mock gateway does not accept external callbacks');
  }
}
