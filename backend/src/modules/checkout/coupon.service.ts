import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/app.exception';
import type { Coupon } from '../../generated/prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import type { Tx } from '../../prisma/transaction';
import { dec } from '../../common/utils/money';
import type { CouponRule } from './pricing';

const invalid = () => new AppException(422, 'COUPON_INVALID', 'This coupon code is not valid or has expired.');

@Injectable()
export class CouponService {
  /** Checks everything that needs the database. Spend and product rules are checked in pricing. */
  /** userId null = cart estimate before sign-in: per-customer rules are skipped and re-checked at checkout. */
  async resolve(db: Tx | PrismaService, code: string, userId: string | null): Promise<Coupon> {
    const c = await db.coupon.findUnique({ where: { code } });
    const now = new Date();
    if (!c || !c.isActive || (c.startsAt && c.startsAt > now) || (c.endsAt && c.endsAt < now)) throw invalid();
    if (c.maxUses != null && c.usedCount >= c.maxUses) {
      throw new AppException(422, 'COUPON_EXHAUSTED', 'This coupon has reached its usage limit.');
    }
    if (c.perUserLimit != null && userId) {
      const used = await db.couponRedemption.count({ where: { couponId: c.id, userId } });
      if (used >= c.perUserLimit) throw new AppException(422, 'COUPON_ALREADY_USED', 'You have already used this coupon.');
    }
    if (c.firstOrderOnly && userId) {
      const prior = await db.order.count({ where: { userId, paymentStatus: 'SUCCEEDED' } });
      if (prior > 0) throw new AppException(422, 'COUPON_FIRST_ORDER_ONLY', 'This coupon is only for your first order.');
    }
    return c;
  }

  toRule(c: Coupon): CouponRule {
    return {
      code: c.code,
      discountType: c.discountType,
      value: dec(c.value),
      maxDiscount: c.maxDiscount ? dec(c.maxDiscount) : null,
      minimumSpend: c.minimumSpend ? dec(c.minimumSpend) : null,
      productIds: c.productIds,
      categoryIds: c.categoryIds,
    };
  }

  /** Atomic cap check: concurrent redemptions cannot exceed maxUses (SRS 12.1). */
  async redeem(tx: Tx, coupon: Coupon, userId: string, orderId: string, discountAmount: string) {
    const updated = await tx.$executeRaw`
      UPDATE "Coupon" SET "usedCount" = "usedCount" + 1
      WHERE id = ${coupon.id} AND ("maxUses" IS NULL OR "usedCount" < "maxUses")`;
    if (updated !== 1) throw new AppException(422, 'COUPON_EXHAUSTED', 'This coupon has reached its usage limit.');
    if (coupon.perUserLimit != null) {
      const used = await tx.couponRedemption.count({ where: { couponId: coupon.id, userId } });
      if (used >= coupon.perUserLimit) throw new AppException(422, 'COUPON_ALREADY_USED', 'You have already used this coupon.');
    }
    await tx.couponRedemption.create({ data: { couponId: coupon.id, userId, orderId, discountAmount } });
  }

  /** Returns the use to the pool when an unpaid order fails, expires or is cancelled. */
  async release(tx: Tx, orderId: string) {
    const r = await tx.couponRedemption.findUnique({ where: { orderId } });
    if (!r) return;
    await tx.couponRedemption.delete({ where: { id: r.id } });
    await tx.$executeRaw`UPDATE "Coupon" SET "usedCount" = GREATEST(0, "usedCount" - 1) WHERE id = ${r.couponId}`;
  }
}
