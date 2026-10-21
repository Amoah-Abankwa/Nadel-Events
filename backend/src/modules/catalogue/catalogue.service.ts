import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { money, dec } from '../../common/utils/money';
import { paginate } from '../../common/utils/pagination';
import type { ProductQuery } from './catalogue.dto';
import { SettingsService } from '../settings/settings.service';
import { ReviewsService } from '../reviews/reviews.service';

const LOW_STOCK = 5;

const listInclude = {
  category: { select: { slug: true, name: true } },
  variants: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
} satisfies Prisma.ProductInclude;

type ProductWithVariants = Prisma.ProductGetPayload<{ include: typeof listInclude }>;
type Variant = ProductWithVariants['variants'][number];

export const available = (v: Pick<Variant, 'trackStock' | 'stockOnHand' | 'stockReserved'>) =>
  v.trackStock ? Math.max(0, v.stockOnHand - v.stockReserved) : Number.POSITIVE_INFINITY;

export const variantPrice = (p: { basePrice: Prisma.Decimal }, v: { price: Prisma.Decimal | null }) => v.price ?? p.basePrice;

@Injectable()
export class CatalogueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly reviews: ReviewsService,
  ) {}

  /** Product cards for a hand-picked list (campaign pages), in the given order, published only. */
  async cardsByIds(ids: string[]) {
    if (!ids.length) return [];
    const rows = await this.prisma.product.findMany({ where: { id: { in: ids }, status: 'PUBLISHED' }, include: listInclude });
    const ratings = await this.reviews.ratingsFor(rows.map((r) => r.id));
    const byId = new Map(rows.map((r) => [r.id, { ...toCard(r), rating: ratings.get(r.id) ?? null }]));
    return ids.map((id) => byId.get(id)).filter((x): x is NonNullable<typeof x> => Boolean(x));
  }

  /**
   * Best sellers by units sold in verified-paid orders over the last `days`.
   * Falls back to featured, then newest, so the home page is never empty in a new shop.
   */
  async bestsellers(limit = 6, days = 90) {
    const since = new Date(Date.now() - days * 86_400_000);
    const rows = await this.prisma.$queryRaw<{ productId: string; units: bigint }[]>`
      SELECT oi."productId", SUM(oi.quantity)::bigint AS units
      FROM "OrderItem" oi JOIN "Order" o ON o.id = oi."orderId"
      JOIN "Product" p ON p.id = oi."productId"
      WHERE oi."productId" IS NOT NULL AND o."paymentStatus" IN ('SUCCEEDED', 'PARTIALLY_REFUNDED')
        AND o."paidAt" >= ${since} AND p.status = 'PUBLISHED'
      GROUP BY oi."productId" ORDER BY units DESC LIMIT ${limit}`;
    const cards = await this.cardsByIds(rows.map((r) => r.productId));
    if (cards.length >= limit) return cards;
    const seen = new Set(cards.map((c) => c.id));
    const fill = await this.prisma.product.findMany({
      where: { status: 'PUBLISHED', id: { notIn: [...seen] } },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      take: limit - cards.length,
      select: { id: true },
    });
    return [...cards, ...(await this.cardsByIds(fill.map((f) => f.id)))];
  }

  /** Brands of published products with counts, for the A–Z brand index. */
  async brands() {
    const rows = await this.prisma.product.groupBy({ by: ['brand'], where: { status: 'PUBLISHED', brand: { not: null } }, _count: true });
    return rows
      .filter((r): r is typeof r & { brand: string } => Boolean(r.brand?.trim()))
      .map((r) => ({ name: r.brand.trim(), count: r._count }))
      .sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
  }

  /**
   * "Related products" for the product page, cart, wish list and order confirmation:
   * other products from the same categories as `ids`, featured first, topped up with best sellers.
   */
  async recommendations(ids: string[], limit = 8) {
    const source = ids.length ? await this.prisma.product.findMany({ where: { id: { in: ids } }, select: { categoryId: true } }) : [];
    const categoryIds = [...new Set(source.map((s) => s.categoryId))];
    const picked = categoryIds.length
      ? await this.prisma.product.findMany({
          where: { status: 'PUBLISHED', categoryId: { in: categoryIds }, id: { notIn: ids } },
          orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
          take: limit,
          select: { id: true },
        })
      : [];
    let cards = await this.cardsByIds(picked.map((p) => p.id));
    if (cards.length < limit) {
      const seen = new Set([...ids, ...cards.map((c) => c.id)]);
      cards = [...cards, ...(await this.bestsellers(limit + seen.size)).filter((c) => !seen.has(c.id))].slice(0, limit);
    }
    return cards;
  }

  async listProducts(q: ProductQuery) {
    const where: Prisma.ProductWhereInput = { status: 'PUBLISHED' };

    if (q.q) {
      where.OR = [
        { name: { contains: q.q, mode: 'insensitive' } },
        { description: { contains: q.q, mode: 'insensitive' } },
        { variants: { some: { sku: { equals: q.q, mode: 'insensitive' } } } },
      ];
    }
    if (q.category) {
      const ids = await this.categoryWithDescendants(q.category);
      if (!ids.length) return paginate([], 0, q);
      where.categoryId = { in: ids };
    }
    if (q.minPrice != null || q.maxPrice != null) {
      where.basePrice = { ...(q.minPrice != null ? { gte: q.minPrice } : {}), ...(q.maxPrice != null ? { lte: q.maxPrice } : {}) };
    }
    if (q.featured) where.isFeatured = true;
    if (q.brand) where.brand = { equals: q.brand, mode: 'insensitive' };
    if (q.onSale) where.compareAtPrice = { gt: this.prisma.product.fields.basePrice };
    const buyable = { isActive: true, OR: [{ trackStock: false }, { stockOnHand: { gt: this.prisma.productVariant.fields.stockReserved } }] };
    if (q.stock === 'out') where.variants = { none: buyable };
    if (q.inStock || q.stock === 'in') {
      where.variants = {
        some: {
          isActive: true,
          OR: [{ trackStock: false }, { stockOnHand: { gt: this.prisma.productVariant.fields.stockReserved } }],
        },
      };
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      q.sort === 'price_asc' ? { basePrice: 'asc' }
      : q.sort === 'price_desc' ? { basePrice: 'desc' }
      : q.sort === 'name' ? { name: 'asc' }
      : { createdAt: 'desc' };

    const [rows, total] = await Promise.all([
      this.prisma.product.findMany({ where, orderBy, include: listInclude, skip: (q.page - 1) * q.limit, take: q.limit }),
      this.prisma.product.count({ where }),
    ]);
    const ratings = await this.reviews.ratingsFor(rows.map((r) => r.id));
    return paginate(rows.map((r) => ({ ...toCard(r), rating: ratings.get(r.id) ?? null })), total, q);
  }

  async getProduct(slug: string) {
    const p = await this.prisma.product.findFirst({ where: { slug, status: 'PUBLISHED' }, include: listInclude });
    if (!p) throw new NotFoundException({ code: 'PRODUCT_NOT_FOUND', message: 'This product is not available.' });

    const related = await this.prisma.product.findMany({
      where: { status: 'PUBLISHED', categoryId: p.categoryId, id: { not: p.id } },
      include: listInclude,
      take: 4,
      orderBy: { isFeatured: 'desc' },
    });

    const ratings = await this.reviews.ratingsFor([p.id, ...related.map((r) => r.id)]);
    return {
      ...toCard(p),
      rating: ratings.get(p.id) ?? null,
      description: p.description,
      brand: p.brand,
      returnWindowDays: await this.settings.effectiveReturnDays(p),
      attributes: p.attributes,
      variants: p.variants.map((v) => {
        const qty = available(v);
        return {
          id: v.id,
          name: v.name,
          sku: v.sku,
          options: v.options,
          price: money(variantPrice(p, v)),
          inStock: qty > 0,
          lowStock: qty > 0 && qty <= LOW_STOCK,
          maxQuantity: Number.isFinite(qty) ? Math.min(qty, 99) : 99,
        };
      }),
      related: related.map((r) => ({ ...toCard(r), rating: ratings.get(r.id) ?? null })),
    };
  }

  async categoryTree() {
    const all = await this.prisma.category.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
    const fallback = (await this.settings.get()).returnWindowWorkingDays;
    type Node = (typeof all)[number] & { children: Node[]; effectiveReturnDays: number };
    const map = new Map<string, Node>();
    for (const c of all) {
      map.set(c.id, { ...c, children: [], effectiveReturnDays: (await this.settings.categoryReturnDays(c.id)) ?? fallback });
    }
    const roots: Node[] = [];
    for (const node of map.values()) {
      const parent = node.parentId ? map.get(node.parentId) : undefined;
      (parent ? parent.children : roots).push(node);
    }
    const strip = (n: Node): unknown => ({ id: n.id, name: n.name, slug: n.slug, description: n.description, imageUrl: n.imageUrl, returnWindowDays: n.effectiveReturnDays, children: n.children.map(strip) });
    return roots.map(strip);
  }

  async getCategory(slug: string) {
    const c = await this.prisma.category.findFirst({ where: { slug, isActive: true } });
    if (!c) throw new NotFoundException({ code: 'CATEGORY_NOT_FOUND', message: 'This category does not exist.' });
    return { id: c.id, name: c.name, slug: c.slug, description: c.description, imageUrl: c.imageUrl };
  }

  private async categoryWithDescendants(slug: string): Promise<string[]> {
    const all = await this.prisma.category.findMany({ where: { isActive: true }, select: { id: true, slug: true, parentId: true } });
    const root = all.find((c) => c.slug === slug);
    if (!root) return [];
    const ids = [root.id];
    for (let i = 0; i < ids.length; i++) {
      for (const c of all) if (c.parentId === ids[i]) ids.push(c.id);
    }
    return ids;
  }
}

function toCard(p: ProductWithVariants) {
  const prices = p.variants.map((v) => dec(variantPrice(p, v)));
  const min = prices.length ? prices.reduce((a, b) => (a.lt(b) ? a : b)) : dec(p.basePrice);
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    images: p.images,
    category: p.category,
    price: money(min),
    hasPriceRange: prices.some((x) => !x.eq(min)),
    compareAtPrice: p.compareAtPrice ? money(p.compareAtPrice) : null,
    inStock: p.variants.some((v) => available(v) > 0),
    defaultVariantId: p.variants.length === 1 ? p.variants[0].id : null,
    pickupOnly: p.pickupOnly,
  };
}
