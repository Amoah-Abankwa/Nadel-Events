# Backend (NestJS API)

Base path is `/api/v1`. The module layout follows SRS section 6.3:

```
src/
  config/env.ts              Zod-validated environment (fails fast at boot)
  prisma/                    PrismaService (pg adapter) + serializable() retry helper
  common/                    Error contract, guards (auth → roles), request ID, origin check, money utils
  modules/
    auth/                    register, login, refresh (rotating), logout, forgot/reset password
    catalogue/               products, categories (public)
    checkout/                cart/validate, delivery/areas, checkout/quote, checkout/orders, pricing engine
    inventory/               atomic reserve / consume / release / adjust
    payments/                gateway abstraction, mock + Hubtel stub, processor (verify + idempotency), expiry job
    orders/                  status, cancel, reorder, order state machine
    me/                      profile, addresses, orders, wishlist
    admin/                   products, stock, orders, delivery zones, coupons, reconcile, outbox, audit
    notifications/           transactional outbox, worker, Resend sender, email templates
    audit/                   redacted audit log
```

## Commands

```bash
npm install                 # also runs prisma generate
npx prisma migrate dev      # create/apply migrations (uses DIRECT_URL)
npm run seed
npm run start:dev
npm test                    # pricing + order-state unit tests
```

## Payment flow

The full sequence from checkout to a paid order:

1. `POST /checkout/orders` runs in one serializable transaction. It recalculates the quote, creates the order with snapshots, atomically reserves stock and redeems the coupon, and writes an `ORDER_PLACED` email to the outbox.
2. `PaymentsService.initiate` creates or resumes a payment attempt and returns the provider checkout URL.
3. The customer pays. The provider calls `POST /payments/:provider/callback`. The callback is authenticated, deduplicated by event ID, and then **verified server-to-server** before anything changes.
4. `PaymentProcessor.reconcile` checks the amount and currency. In one transaction it marks the payment succeeded, sets the order to `PAID`, consumes the reservation, and queues the receipt and owner email.
5. A job runs every minute. It verifies once more, then expires unpaid orders past `RESERVATION_MINUTES` and releases their stock and coupon.

`/checkout/result` polls `GET /orders/:orderNumber/status`. Each poll also triggers verification, so a slow callback never leaves the customer waiting.

## Production notes

- Add DB `CHECK` constraints in a migration: `"stockOnHand" >= 0`, `"stockReserved" >= 0`, `"stockReserved" <= "stockOnHand"` (when `trackStock`).
- The outbox worker and expiry job run in-process. If you run several API instances, the outbox is safe (`SKIP LOCKED`), and the expiry job is idempotent.
- Implement `HubtelGateway` from Hubtel's current docs before setting `PAYMENT_PROVIDER=hubtel`.
