import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/app.exception';
import type { Tx } from '../../prisma/transaction';

export interface ReserveLine {
  variantId: string;
  quantity: number;
  name: string;
}

/**
 * Reservation policy (SRS 9.3): stock is reserved when the pending order is created,
 * consumed on verified payment, and released on failure, expiry or cancellation.
 * Every mutation here must run inside the caller's transaction.
 */
@Injectable()
export class InventoryService {
  async reserve(tx: Tx, orderId: string, lines: ReserveLine[], expiresAt: Date) {
    // Lock rows in a stable order to avoid deadlocks between concurrent checkouts.
    const sorted = [...lines].sort((a, b) => a.variantId.localeCompare(b.variantId));
    for (const line of sorted) {
      // Atomic check-and-reserve: succeeds only if enough unreserved stock remains.
      const updated = await tx.$executeRaw`
        UPDATE "ProductVariant"
        SET "stockReserved" = "stockReserved" + CASE WHEN "trackStock" THEN ${line.quantity}::int ELSE 0 END
        WHERE id = ${line.variantId}
          AND "isActive" = true
          AND (NOT "trackStock" OR "stockOnHand" - "stockReserved" >= ${line.quantity}::int)`;
      if (updated !== 1) {
        throw new AppException(409, 'OUT_OF_STOCK', `${line.name} no longer has enough stock. Update your cart and try again.`, [
          { field: line.variantId, issue: 'insufficient_stock' },
        ]);
      }
    }
    await tx.stockReservation.createMany({
      data: sorted.map((l) => ({ orderId, variantId: l.variantId, quantity: l.quantity, expiresAt })),
    });
    await tx.inventoryMovement.createMany({
      data: sorted.map((l) => ({ variantId: l.variantId, delta: 0, reason: 'RESERVATION' as const, orderId, note: `reserved ${l.quantity}` })),
    });
  }

  /** Payment verified: reserved units leave stock permanently. */
  async consume(tx: Tx, orderId: string) {
    const active = await tx.stockReservation.findMany({ where: { orderId, status: 'ACTIVE' } });
    for (const r of active) {
      await tx.$executeRaw`
        UPDATE "ProductVariant"
        SET "stockOnHand" = "stockOnHand" - CASE WHEN "trackStock" THEN ${r.quantity}::int ELSE 0 END,
            "stockReserved" = GREATEST(0, "stockReserved" - CASE WHEN "trackStock" THEN ${r.quantity}::int ELSE 0 END)
        WHERE id = ${r.variantId}`;
    }
    if (!active.length) return;
    await tx.stockReservation.updateMany({ where: { orderId, status: 'ACTIVE' }, data: { status: 'CONSUMED' } });
    await tx.inventoryMovement.createMany({
      data: active.map((r) => ({ variantId: r.variantId, delta: -r.quantity, reason: 'SALE' as const, orderId })),
    });
  }

  async release(tx: Tx, orderId: string, note: string) {
    const active = await tx.stockReservation.findMany({ where: { orderId, status: 'ACTIVE' } });
    for (const r of active) {
      await tx.$executeRaw`
        UPDATE "ProductVariant"
        SET "stockReserved" = GREATEST(0, "stockReserved" - CASE WHEN "trackStock" THEN ${r.quantity}::int ELSE 0 END)
        WHERE id = ${r.variantId}`;
    }
    if (!active.length) return;
    await tx.stockReservation.updateMany({ where: { orderId, status: 'ACTIVE' }, data: { status: 'RELEASED' } });
    await tx.inventoryMovement.createMany({
      data: active.map((r) => ({ variantId: r.variantId, delta: 0, reason: 'RESERVATION_RELEASE' as const, orderId, note })),
    });
  }

  /** Admin restock/adjustment. Never lets on-hand drop below what is reserved. */
  async adjust(tx: Tx, variantId: string, delta: number, actorId: string, note?: string, reason?: 'RETURN') {
    const updated = await tx.$executeRaw`
      UPDATE "ProductVariant" SET "stockOnHand" = "stockOnHand" + ${delta}::int
      WHERE id = ${variantId} AND "stockOnHand" + ${delta}::int >= "stockReserved"`;
    if (updated !== 1) {
      throw new AppException(409, 'STOCK_BELOW_RESERVED', 'Stock cannot go below the quantity reserved by pending orders.');
    }
    await tx.inventoryMovement.create({
      data: { variantId, delta, reason: reason ?? (delta >= 0 ? 'RESTOCK' : 'ADJUSTMENT'), actorId, note },
    });
  }
}
