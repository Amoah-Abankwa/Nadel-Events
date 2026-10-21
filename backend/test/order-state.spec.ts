import { canTransition } from '../src/modules/orders/order-state';

describe('order state machine', () => {
  it('allows the normal pickup path', () => {
    expect(canTransition('PAID', 'PROCESSING', 'PICKUP')).toBe(true);
    expect(canTransition('PROCESSING', 'READY_FOR_PICKUP', 'PICKUP')).toBe(true);
    expect(canTransition('READY_FOR_PICKUP', 'COMPLETED', 'PICKUP')).toBe(true);
  });

  it('blocks skipping payment', () => {
    expect(canTransition('PENDING_PAYMENT', 'PROCESSING')).toBe(false);
  });

  it('blocks delivery states on pickup orders and vice versa', () => {
    expect(canTransition('PROCESSING', 'OUT_FOR_DELIVERY', 'PICKUP')).toBe(false);
    expect(canTransition('PROCESSING', 'READY_FOR_PICKUP', 'DELIVERY')).toBe(false);
  });

  it('treats closed states as terminal', () => {
    for (const s of ['CANCELLED', 'EXPIRED', 'PAYMENT_FAILED'] as const) {
      expect(canTransition(s, 'PAID')).toBe(false);
    }
  });
});
