import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { paginate } from '../../common/utils/pagination';
import { AuditService } from '../audit/audit.service';
import { InventoryService } from '../inventory/inventory.service';
import { AdminProductQuery, CreateProductDto, StockAdjustDto, UpdateProductDto, VariantInput, VariantUpdateDto } from './admin.dto';

@Roles('ADMIN')
@Controller('admin/products')
export class AdminCatalogueController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly inventory: InventoryService,
  ) {}

  /** Marketing can search products to put on campaign pages. */
  @Roles('ADMIN', 'MARKETING')
  @Get()
  async list(@Query() q: AdminProductQuery) {
    let lowIds: string[] | undefined;
    if (q.lowStock) {
      const rows = await this.prisma.$queryRaw<{ id: string }[]>`
        SELECT DISTINCT v."productId" AS id FROM "ProductVariant" v
        WHERE v."trackStock" AND v."isActive" AND v."stockOnHand" - v."stockReserved" <= 5`;
      lowIds = rows.map((r) => r.id);
    }
    const where: Prisma.ProductWhereInput = {
      ...(lowIds ? { id: { in: lowIds } } : {}),
      ...(q.status ? { status: q.status } : {}),
      ...(q.q ? { OR: [{ name: { contains: q.q, mode: 'insensitive' } }, { variants: { some: { sku: { contains: q.q, mode: 'insensitive' } } } }] } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.product.findMany({ where, include: { variants: true, category: { select: { name: true } } }, orderBy: { updatedAt: 'desc' }, skip: (q.page - 1) * q.limit, take: q.limit }),
      this.prisma.product.count({ where }),
    ]);
    return paginate(items, total, q);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.prisma.product.findUniqueOrThrow({ where: { id }, include: { variants: { orderBy: { sortOrder: 'asc' } } } });
  }

  @Post(':id/variants')
  async addVariant(@Param('id') id: string, @Body() dto: VariantInput, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.prisma.$transaction(async (tx) => {
      const count = await tx.productVariant.count({ where: { productId: id } });
      const v = await tx.productVariant.create({ data: { productId: id, name: dto.name, sku: dto.sku, price: dto.price, trackStock: dto.trackStock ?? true, sortOrder: count } });
      if (dto.stockOnHand) await this.inventory.adjust(tx, v.id, dto.stockOnHand, user.id, 'Initial stock');
      await this.audit.record({ actorId: user.id, requestId: req.requestId, action: 'variant.create', resourceType: 'ProductVariant', resourceId: v.id, after: dto }, tx);
      return v;
    });
  }

  /** Stock is never edited here; use the stock endpoint so every change is recorded. */
  @Patch('variants/:variantId')
  async updateVariant(@Param('variantId') variantId: string, @Body() dto: VariantUpdateDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.productVariant.findUniqueOrThrow({ where: { id: variantId } });
      const after = await tx.productVariant.update({ where: { id: variantId }, data: dto });
      await this.audit.record({ actorId: user.id, requestId: req.requestId, action: 'variant.update', resourceType: 'ProductVariant', resourceId: variantId, before, after }, tx);
      return after;
    });
  }

  @Post()
  async create(@Body() dto: CreateProductDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    const { variants, specs, ...data } = dto;
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: { ...data, images: data.images ?? [], ...(specs ? { attributes: { specs } as unknown as Prisma.InputJsonValue } : {}), variants: { create: variants.map((v, i) => ({ ...v, stockOnHand: 0, sortOrder: i })) } },
        include: { variants: true },
      });
      for (const v of product.variants) {
        const initial = variants.find((x) => x.sku === v.sku)?.stockOnHand ?? 0;
        if (initial > 0) await this.inventory.adjust(tx, v.id, initial, user.id, 'Initial stock');
      }
      await this.audit.record({ actorId: user.id, requestId: req.requestId, action: 'product.create', resourceType: 'Product', resourceId: product.id, after: dto }, tx);
      return product;
    });
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateProductDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.product.findUniqueOrThrow({ where: { id } });
      const { specs, ...rest } = dto;
      const after = await tx.product.update({ where: { id }, data: { ...rest, ...(specs ? { attributes: { specs } as unknown as Prisma.InputJsonValue } : {}) } });
      await this.audit.record({ actorId: user.id, requestId: req.requestId, action: 'product.update', resourceType: 'Product', resourceId: id, before, after }, tx);
      return after;
    });
  }

  /** Archive, never hard-delete: historic orders reference products (SRS 7.1). */
  @Delete(':id')
  archive(@Param('id') id: string, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.update(id, { status: 'ARCHIVED' }, user, req);
  }

  @Post('variants/:variantId/stock')
  async adjustStock(@Param('variantId') variantId: string, @Body() dto: StockAdjustDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.prisma.$transaction(async (tx) => {
      await this.inventory.adjust(tx, variantId, dto.delta, user.id, dto.note);
      await this.audit.record({ actorId: user.id, requestId: req.requestId, action: 'stock.adjust', resourceType: 'ProductVariant', resourceId: variantId, after: dto }, tx);
      return tx.productVariant.findUniqueOrThrow({ where: { id: variantId }, select: { id: true, sku: true, stockOnHand: true, stockReserved: true } });
    });
  }
}
