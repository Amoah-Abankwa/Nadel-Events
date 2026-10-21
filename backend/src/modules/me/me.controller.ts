import { Body, Controller, Delete, Get, HttpCode, NotFoundException, Param, Patch, Post, Query } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { PageQuery } from '../../common/utils/pagination';
import { OrdersService } from '../orders/orders.service';
import { PatchAddressDto, SaveAddressDto, UpdateProfileDto } from './me.dto';

const profileSelect = { id: true, email: true, name: true, phone: true, role: true, createdAt: true } as const;

@Controller('me')
export class MeController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
  ) {}

  @Get()
  profile(@CurrentUser() user: AuthUser) {
    return this.prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: profileSelect });
  }

  @Patch()
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.prisma.user.update({ where: { id: user.id }, data: dto, select: profileSelect });
  }

  // ----- addresses -----
  @Get('addresses')
  addresses(@CurrentUser() user: AuthUser) {
    return this.prisma.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }] });
  }

  @Post('addresses')
  async addAddress(@CurrentUser() user: AuthUser, @Body() dto: SaveAddressDto) {
    return this.prisma.$transaction(async (tx) => {
      const count = await tx.address.count({ where: { userId: user.id } });
      const isDefault = dto.isDefault || count === 0;
      if (isDefault) await tx.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
      return tx.address.create({ data: { ...dto, isDefault, userId: user.id } });
    });
  }

  @Patch('addresses/:id')
  async patchAddress(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: PatchAddressDto) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.address.findFirst({ where: { id, userId: user.id } });
      if (!existing) throw new NotFoundException({ code: 'ADDRESS_NOT_FOUND', message: 'Address not found.' });
      if (dto.isDefault) await tx.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
      return tx.address.update({ where: { id }, data: dto });
    });
  }

  @HttpCode(204) @Delete('addresses/:id')
  async deleteAddress(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const { count } = await this.prisma.address.deleteMany({ where: { id, userId: user.id } });
    if (!count) throw new NotFoundException({ code: 'ADDRESS_NOT_FOUND', message: 'Address not found.' });
  }

  // ----- orders -----
  @Get('orders')
  myOrders(@CurrentUser() user: AuthUser, @Query() q: PageQuery) {
    return this.orders.listMine(user.id, q);
  }

  @Get('orders/:orderNumber')
  myOrder(@CurrentUser() user: AuthUser, @Param('orderNumber') orderNumber: string) {
    return this.orders.getMine(user.id, orderNumber);
  }

  /** Everything we hold about the customer, as JSON (data-protection access request). */
  @Get('export')
  async export(@CurrentUser() user: AuthUser) {
    const [profile, addresses, orders, requests, reviews, wishlist, giveawayEntries] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { ...profileSelect, updatedAt: true } }),
      this.prisma.address.findMany({ where: { userId: user.id } }),
      this.prisma.order.findMany({ where: { userId: user.id }, include: { items: true, history: true, refunds: { select: { amount: true, reason: true, status: true, createdAt: true } } }, orderBy: { placedAt: 'desc' } }),
      this.prisma.serviceRequest.findMany({ where: { userId: user.id }, omit: { staffNotes: true, referenceImages: true } }),
      this.prisma.review.findMany({ where: { userId: user.id }, include: { product: { select: { name: true } } } }),
      this.prisma.wishlistItem.findMany({ where: { userId: user.id }, include: { product: { select: { name: true, slug: true } } } }),
      this.prisma.giveawayEntry.findMany({ where: { userId: user.id }, omit: { ipHash: true }, include: { giveaway: { select: { title: true } } } }),
    ]);
    return { exportedAt: new Date().toISOString(), profile, addresses, orders, serviceRequests: requests, reviews, wishlist, giveawayEntries };
  }

  // ----- wishlist -----
  @Get('wishlist')
  async wishlist(@CurrentUser() user: AuthUser) {
    const rows = await this.prisma.wishlistItem.findMany({
      where: { userId: user.id, product: { status: 'PUBLISHED' } },
      include: { product: { select: { id: true, slug: true, name: true, images: true, basePrice: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => ({ ...r.product, basePrice: r.product.basePrice.toString(), addedAt: r.createdAt }));
  }

  @HttpCode(204) @Post('wishlist/:productId')
  async addWish(@CurrentUser() user: AuthUser, @Param('productId') productId: string) {
    const product = await this.prisma.product.findFirst({ where: { id: productId, status: 'PUBLISHED' }, select: { id: true } });
    if (!product) throw new NotFoundException({ code: 'PRODUCT_NOT_FOUND', message: 'This product is not available.' });
    await this.prisma.wishlistItem.upsert({
      where: { userId_productId: { userId: user.id, productId } },
      create: { userId: user.id, productId },
      update: {},
    });
  }

  @HttpCode(204) @Delete('wishlist/:productId')
  async removeWish(@CurrentUser() user: AuthUser, @Param('productId') productId: string) {
    await this.prisma.wishlistItem.deleteMany({ where: { userId: user.id, productId } });
  }
}
