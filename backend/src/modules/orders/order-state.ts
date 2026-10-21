import { AppException } from '../../common/app.exception';
import type { FulfilmentType, OrderStatus } from '../../generated/prisma/client';

/** SRS 9.5. Payment-driven transitions (PAID, PAYMENT_FAILED, EXPIRED) are made only by the payment processor. */
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ['PAID', 'PAYMENT_FAILED', 'CANCELLED', 'EXPIRED'],
  PAID: ['PROCESSING', 'REFUND_PENDING'],
  PROCESSING: ['READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'REFUND_PENDING'],
  READY_FOR_PICKUP: ['COMPLETED'],
  OUT_FOR_DELIVERY: ['COMPLETED', 'DELIVERY_EXCEPTION'],
  DELIVERY_EXCEPTION: ['OUT_FOR_DELIVERY', 'REFUND_PENDING'],
  COMPLETED: ['REFUND_PENDING'],
  REFUND_PENDING: [],
  PAYMENT_FAILED: [],
  CANCELLED: [],
  EXPIRED: [],
};

/** Statuses staff may set by hand from the admin order screen. */
export const STAFF_SETTABLE: OrderStatus[] = ['PROCESSING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERY_EXCEPTION', 'COMPLETED'];

export function canTransition(from: OrderStatus, to: OrderStatus, fulfilment?: FulfilmentType): boolean {
  if (!TRANSITIONS[from].includes(to)) return false;
  if (fulfilment === 'PICKUP' && (to === 'OUT_FOR_DELIVERY' || to === 'DELIVERY_EXCEPTION')) return false;
  if (fulfilment === 'DELIVERY' && to === 'READY_FOR_PICKUP') return false;
  return true;
}

export function assertTransition(from: OrderStatus, to: OrderStatus, fulfilment?: FulfilmentType) {
  if (!canTransition(from, to, fulfilment)) {
    throw new AppException(409, 'INVALID_STATUS_TRANSITION', `An order cannot move from ${from} to ${to}.`);
  }
}
