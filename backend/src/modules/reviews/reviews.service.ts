import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { ModerationStatus, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PageQuery, paginate } from '../../common/utils/pagination';
import { AuditService } from '../audit/audit.service';
import { SettingsService } from '../settings/settings.service';

/** "Ama Mensah" -> "Ama M." so reviews never publish full names. */
export const displayName = (name: string) => {
  const [first, ...rest] = name.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last[0].toUpperCase()}.` : first;
};

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
  ) {}

  /** Average rating and count of APPROVED reviews per product, for product cards. */
  /** Recent, substantial, approved 4–5 star reviews for the home page ("What customers say"). */
  async highlights(limit = 3) {
    const rows = await this.prisma.review.findMany({
      where: { status: 'APPROVED', rating: { gte: 4 }, product: { status: 'PUBLISHED' } },
      include: { user: { select: { name: true } }, product: { select: { name: true, slug: true } } },
      orderBy: [{ rating: 'desc' }, { createdAt: 'desc' }],
      take: limit * 4,
    });
    return rows
      .filter((r) => r.body.trim().length >= 40)
      .slice(0, limit)
      .map((r) => ({ id: r.id, rating: r.rating, title: r.title, body: r.body, author: displayName(r.user.name), verifiedPurchase: r.verifiedPurchase, product: r.product }));
  }

  async ratingsFor(productIds: string[]) {
    if (!productIds.length) return new Map<string, { average: number; count: number }>();
    const rows = await this.prisma.review.groupBy({ by: ['productId'], where: { productId: { in: productIds }, status: 'APPROVED' }, _avg: { rating: true }, _count: true });
    return new Map(rows.map((r) => [r.productId, { average: Math.round((r._avg.rating ?? 0) * 10) / 10, count: r._count }]));
  }

  async listForProduct(slug: string, q: PageQuery, userId?: string) {
    const product = await this.prisma.product.findFirst({ where: { slug, status: 'PUBLISHED' }, select: { id: true } });
    if (!product) throw new NotFoundException({ code: 'PRODUCT_NOT_FOUND', message: 'This product is not available.' });
    const where = { productId: product.id, status: 'APPROVED' as const };
    const [rows, total, dist, mine, settings] = await Promise.all([
      this.prisma.review.findMany({ where, include: { user: { select: { name: true } } }, orderBy: [{ verifiedPurchase: 'desc' }, { createdAt: 'desc' }], skip: (q.page - 1) * q.limit, take: q.limit }),
      this.prisma.review.count({ where }),
      this.prisma.review.groupBy({ by: ['rating'], where, _count: true }),
      userId ? this.prisma.review.findUnique({ where: { userId_productId: { userId, productId: product.id } } }) : null,
      this.settings.get(),
    ]);
    const sum = dist.reduce((a, d) => a + d.rating * d._count, 0);
    const canReview = userId ? !settings.reviewsRequirePurchase || (await this.hasBought(userId, product.id)) : false;
    return {
      summary: {
        average: total ? Math.round((sum / total) * 10) / 10 : null,
        count: total,
        distribution: [5, 4, 3, 2, 1].map((star) => ({ star, count: dist.find((d) => d.rating === star)?._count ?? 0 })),
      },
      requirePurchase: settings.reviewsRequirePurchase,
      canReview,
      mine: mine ? { rating: mine.rating, title: mine.title, body: mine.body, status: mine.status } : null,
      ...paginate(rows.map((r) => ({ id: r.id, rating: r.rating, title: r.title, body: r.body, author: displayName(r.user.name), verifiedPurchase: r.verifiedPurchase, createdAt: r.createdAt })), total, q),
    };
  }

  /** One review per customer per product; editing sends it back for moderation. */
  async upsert(userId: string, slug: string, dto: { rating: number; title?: string; body: string }) {
    const product = await this.prisma.product.findFirst({ where: { slug, status: 'PUBLISHED' }, select: { id: true } });
    if (!product) throw new NotFoundException({ code: 'PRODUCT_NOT_FOUND', message: 'This product is not available.' });
    const verified = await this.hasBought(userId, product.id);
    if (!verified && (await this.settings.get()).reviewsRequirePurchase) {
      throw new ForbiddenException({ code: 'REVIEW_NOT_ALLOWED', message: 'Only customers who bought this product can review it.' });
    }
    const data = { rating: dto.rating, title: dto.title || null, body: dto.body, verifiedPurchase: verified, status: 'PENDING' as const, moderatedAt: null, moderatedBy: null };
    await this.prisma.review.upsert({
      where: { userId_productId: { userId, productId: product.id } },
      create: { ...data, userId, productId: product.id },
      update: data,
    });
    return { status: 'PENDING' };
  }

  async adminList(q: PageQuery & { status?: ModerationStatus }) {
    const where: Prisma.ReviewWhereInput = q.status ? { status: q.status } : {};
    const [rows, total] = await Promise.all([
      this.prisma.review.findMany({ where, include: { user: { select: { name: true, email: true } }, product: { select: { name: true, slug: true } } }, orderBy: { createdAt: 'desc' }, skip: (q.page - 1) * q.limit, take: q.limit }),
      this.prisma.review.count({ where }),
    ]);
    return paginate(rows, total, q);
  }

  async moderate(id: string, status: 'APPROVED' | 'REJECTED', actorId: string, requestId?: string) {
    const before = await this.prisma.review.findUniqueOrThrow({ where: { id } });
    const after = await this.prisma.review.update({ where: { id }, data: { status, moderatedBy: actorId, moderatedAt: new Date() } });
    await this.audit.record({ actorId, requestId, action: 'review.moderate', resourceType: 'Review', resourceId: id, before: { status: before.status }, after: { status } });
    return after;
  }

  private async hasBought(userId: string, productId: string) {
    const n = await this.prisma.orderItem.count({
      where: { productId, order: { userId, paymentStatus: { in: ['SUCCEEDED', 'PARTIALLY_REFUNDED'] } } },
    });
    return n > 0;
  }
}
