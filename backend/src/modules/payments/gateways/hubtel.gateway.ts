import { Injectable, Logger, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../../config/env';
import type { CallbackInput, InitiateInput, InitiateResult, ParsedCallback, ParsedRefundCallback, PaymentGateway, RefundInput, RefundResult, RefundStatusInput, VerifyResult } from './payment-gateway';

/**
 * Hubtel integration: INTENTIONALLY NOT IMPLEMENTED.
 *
 * The SRS (Appendix C) requires wire-level details to come from Hubtel's current official
 * documentation and your merchant account, not from assumptions. To implement:
 *
 *  1. initiate(): call Hubtel's current checkout/payment-request API with the server-calculated
 *     amount, our `reference` as the client reference, and returnUrl/cancelUrl/callbackUrl.
 *     Return the hosted checkout URL Hubtel gives you.
 *  2. verify(): call Hubtel's server-to-server transaction status endpoint for `reference`.
 *     Map their statuses to SUCCEEDED / FAILED / PENDING and return the amount and currency they report.
 *     The processor compares these with the stored payment before marking anything paid.
 *  3. parseCallback(): authenticate the callback using whatever Hubtel currently documents
 *     (signature header, shared secret, IP allowlist, …) using req.rawBody where signatures
 *     need the exact bytes. Extract a stable event id and our reference, and strip
 *     phone numbers or other personal data you don't need before returning redactedPayload.
 *  4. Test in Hubtel's sandbox, including duplicate and out-of-order callbacks (SRS 15.3).
 *
 *  5. Refunds through Hubtel's refund API (confirmed business choice). Implement the three
 *     refund methods below from Hubtel's current refund documentation, then set
 *     HUBTEL_REFUNDS_ENABLED=true. Until that flag is on, the admin only offers "record a refund
 *     made outside the system", so a half-built integration can never be triggered.
 *       - refund(): request a refund of `amount` against the original transaction
 *         (providerTransactionId / paymentReference). Send our `refundId` as the client
 *         reference so retries are idempotent on their side too. Map their immediate answer to
 *         SUCCEEDED / PENDING / FAILED. Mobile-money refunds are usually PENDING at first.
 *         Check whether partial refunds are allowed on your account; if not, reject partials here
 *         with a FAILED result and a clear failureReason.
 *       - refundStatus(): server-to-server status lookup by refundId/providerRefundId. This is the
 *         source of truth; the system polls it every 5 minutes for PENDING refunds.
 *       - parseRefundCallback(): if Hubtel sends refund callbacks, authenticate them the same way as
 *         payment callbacks and return { eventId, refundId }. Callback URL to register:
 *         {API_URL}/api/v1/payments/hubtel/refund-callback
 *     Test in the sandbox: full refund, partial refund, refund larger than paid (must be refused),
 *     duplicate callback, and a refund that stays pending.
 *
 * Credentials: HUBTEL_CLIENT_ID, HUBTEL_CLIENT_SECRET, HUBTEL_MERCHANT_ACCOUNT, HUBTEL_CALLBACK_SECRET.
 */
@Injectable()
export class HubtelGateway implements PaymentGateway {
  readonly name = 'hubtel';
  readonly supportsRefunds: boolean;
  private readonly logger = new Logger(HubtelGateway.name);

  constructor(private readonly config: ConfigService<Env, true>) {
    if (!config.get('HUBTEL_CLIENT_ID', { infer: true }) || !config.get('HUBTEL_CLIENT_SECRET', { infer: true })) {
      this.logger.warn('Hubtel credentials are not set');
    }
    this.supportsRefunds = config.get('HUBTEL_REFUNDS_ENABLED', { infer: true });
  }

  async refund(_input: RefundInput): Promise<RefundResult> {
    throw new NotImplementedException('HubtelGateway.refund is not implemented yet');
  }

  async refundStatus(_input: RefundStatusInput): Promise<RefundResult> {
    throw new NotImplementedException('HubtelGateway.refundStatus is not implemented yet');
  }

  async parseRefundCallback(_input: CallbackInput): Promise<ParsedRefundCallback> {
    throw new NotImplementedException('HubtelGateway.parseRefundCallback is not implemented yet');
  }

  async initiate(_input: InitiateInput): Promise<InitiateResult> {
    throw new NotImplementedException('HubtelGateway.initiate is not implemented yet');
  }

  async verify(_reference: string): Promise<VerifyResult> {
    throw new NotImplementedException('HubtelGateway.verify is not implemented yet');
  }

  async parseCallback(_input: CallbackInput): Promise<ParsedCallback> {
    throw new NotImplementedException('HubtelGateway.parseCallback is not implemented yet');
  }
}
