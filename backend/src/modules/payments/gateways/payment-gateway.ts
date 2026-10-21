import type { IncomingHttpHeaders } from 'node:http';

export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');

export interface InitiateInput {
  reference: string;
  amount: string; // decimal string, 2dp
  currency: string;
  description: string;
  customer: { name: string; email: string; phone: string };
  returnUrl: string;
  cancelUrl: string;
  callbackUrl: string;
}

export interface InitiateResult {
  checkoutUrl: string;
  providerReference?: string;
}

export interface VerifyResult {
  status: 'SUCCEEDED' | 'FAILED' | 'PENDING';
  amount: string;
  currency: string;
  providerTransactionId?: string;
  failureReason?: string;
}

export interface CallbackInput {
  headers: IncomingHttpHeaders;
  body: unknown;
  rawBody?: Buffer;
}

export interface ParsedCallback {
  /** Unique per provider event; used to deduplicate replays. */
  eventId: string;
  /** Our payment reference. */
  reference: string;
  /** Payload with secrets removed, safe to store. */
  redactedPayload: Record<string, unknown>;
}

export interface RefundInput {
  refundId: string; // our id, used as the provider idempotency key where supported
  paymentReference: string;
  providerTransactionId?: string | null;
  amount: string;
  currency: string;
  reason: string;
}

export interface RefundResult {
  status: 'SUCCEEDED' | 'PENDING' | 'FAILED';
  providerRefundId?: string;
  failureReason?: string;
}

export interface RefundStatusInput {
  refundId: string;
  providerRefundId?: string | null;
  paymentReference: string;
}

export interface ParsedRefundCallback {
  eventId: string;
  /** Our refund id (sent to the provider as its client reference). */
  refundId: string;
  redactedPayload: Record<string, unknown>;
}

/**
 * Provider abstraction. The callback body is only a hint: the processor ALWAYS calls verify()
 * server-to-server before changing any state (SRS 9.1 step 9, 12).
 */
export interface PaymentGateway {
  readonly name: string;
  initiate(input: InitiateInput): Promise<InitiateResult>;
  verify(reference: string): Promise<VerifyResult>;
  /** Must authenticate the request (signature / shared secret / IP policy) or throw UnauthorizedException. */
  parseCallback(input: CallbackInput): Promise<ParsedCallback>;
  /**
   * Refunds. When supportsRefunds is false, staff refund in the provider dashboard or by MoMo
   * and record it in the admin instead.
   * Provider refunds are often asynchronous (mobile money): refund() may return PENDING; the final
   * result comes from refundStatus() (polled) or a refund callback, which is only a hint and is
   * always confirmed with refundStatus() before anything changes.
   */
  readonly supportsRefunds: boolean;
  refund?(input: RefundInput): Promise<RefundResult>;
  refundStatus?(input: RefundStatusInput): Promise<RefundResult>;
  parseRefundCallback?(input: CallbackInput): Promise<ParsedRefundCallback>;
}
