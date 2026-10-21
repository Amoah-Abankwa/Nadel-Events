import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env';
import { Prisma, type Coupon, type DeliveryZone } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { serializable, type Tx } from '../../prisma/transaction';
import { AppException } from '../../common/app.exception';
import { dec, money } from '../../common/utils/money';
import { orderNumber } from '../../common/utils/codes';
import { available, variantPrice } from '../catalogue/catalogue.service';
import { InventoryService } from '../inventory/inventory.service';
import { OrderNotifier } from '../notifications/order-notifier';
import { PaymentsService, type PaymentStart } from '../payments/payments.service';
import { SettingsService } from '../settings/settings.service';
import { CouponService } from './coupon.service';
import { computeQuote, type DeliveryRule, type Quote } from './pricing';
import type { CartLineDto, CreateOrderDto, EstimateDto, QuoteDto } from './dto/checkout.dto';

const variantInclude = { product: { include: { category: { select: { id: true } } } } } satisfies Prisma.ProductVariantInclude;
type LoadedVariant = Prisma.ProductVariantGetPayload<{ include: typeof variantInclude }>;

interface BuiltQuote {
  quote: Quote;
  lines: { variant: LoadedVariant; quantity: number; unitPrice: Prisma.Decimal }[];
  coupon: Coupon | null;
  zone: DeliveryZone | null;
}

export interface CreateOrderResult {
  orderNumber: string;
  total: string;
  currency: string;
  payment: PaymentStart | null;
  paymentError?: string;
}

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
    private readonly coupons: CouponService,
    private readonly inventory: InventoryService,
    private readonly notifier: OrderNotifier,
    private readonly payments: PaymentsService,
    private readonly settings: SettingsService,
  ) {}

  /** Public: refreshes a client cart with canonical prices and availability. Never throws on bad lines. */
  async validateCart(lines: CartLineDto[]) {
    const merged = mergeLines(lines);
    const variants = await this.prisma.productVariant.findMany({ where: { id: { in: merged.map((l) => l.variantId) } }, include: variantInclude });
    const byId = new Map(variants.map((v) => [v.id, v]));

    return {
      lines: merged.map((l) => {
        const v = byId.get(l.variantId);
        if (!v || !v.isActive || v.product.status !== 'PUBLISHED') {
          return { variantId: l.variantId, status: 'UNAVAILABLE' as const, quantity: 0 };
        }
        const qty = available(v);
        const maxQuantity = Number.isFinite(qty) ? Math.min(qty, 99) : 99;
        const quantity = Math.min(l.quantity, maxQuantity);
        return {
          variantId: v.id,
          productId: v.productId,
          slug: v.product.slug,
          productName: v.product.name,
          variantName: v.name,
          image: v.product.images[0] ?? null,
          unitPrice: money(variantPrice(v.product, v)),
          pickupOnly: v.product.pickupOnly,
          quantity,
          maxQuantity,
          status: maxQuantity === 0 ? ('OUT_OF_STOCK' as const) : quantity < l.quantity ? ('QUANTITY_REDUCED' as const) : ('OK' as const),
        };
      }),
    };
  }

  /** Nationwide coverage: one entry per zone, tagged with its region (areas = [] means the whole region). */
  async deliveryZones() {
    const zones = await this.prisma.deliveryZone.findMany({ where: { isActive: true }, orderBy: [{ region: 'asc' }, { sortOrder: 'asc' }] });
    return zones.map((z) => ({
      zone: z.name,
      region: z.region,
      areas: z.areas,
      leadTime: z.leadTime,
      fee: money(z.fee),
      minimumOrder: z.minimumOrder ? money(z.minimumOrder) : null,
      freeDeliveryThreshold: z.freeDeliveryThreshold ? money(z.freeDeliveryThreshold) : null,
      serviceHours: z.serviceHours,
    }));
  }

  /**
   * Public cart estimate (shown in the cart before sign-in). Same pricing engine as checkout.
   * A bad coupon or an unsupported delivery region doesn't fail the estimate: it's dropped and
   * the reason returned, so the cart can still show totals. Checkout always re-quotes.
   */
  async estimate(dto: EstimateDto) {
    let couponCode = dto.couponCode;
    let region = dto.deliveryRegion;
    let couponError: string | null = null;
    let deliveryError: string | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const built = await this.buildQuote(this.prisma, null, { lines: dto.lines, fulfilmentType: region ? 'DELIVERY' : 'PICKUP', deliveryRegion: region, deliveryArea: dto.deliveryArea, couponCode } as QuoteDto, { region, area: dto.deliveryArea });
        return { ...built.quote, currency: this.currency, deliveryZone: built.zone?.name ?? null, deliveryLeadTime: built.zone?.leadTime ?? null, fulfilmentType: region ? 'DELIVERY' : 'PICKUP', couponError, deliveryError };
      } catch (e) {
        if (!(e instanceof AppException)) throw e;
        if (couponCode && e.code.startsWith('COUPON_')) { couponError = e.message; couponCode = undefined; continue; }
        if (region && (e.code.startsWith('DELIVERY_') || e.code === 'PICKUP_ONLY_ITEM')) { deliveryError = e.message; region = undefined; continue; }
        throw e;
      }
    }
    throw new AppException(422, 'ESTIMATE_FAILED', 'We couldn’t estimate this cart. Try again at checkout.');
  }

  async quote(userId: string, dto: QuoteDto) {
    const built = await this.buildQuote(this.prisma, userId, dto, { region: dto.deliveryRegion, area: dto.deliveryArea });
    return { ...built.quote, currency: this.currency, deliveryZone: built.zone?.name ?? null, deliveryLeadTime: built.zone?.leadTime ?? null };
  }

  async createOrder(userId: string, dto: CreateOrderDto): Promise<CreateOrderResult> {
    const existing = await this.prisma.order.findUnique({ where: { userId_checkoutKey: { userId, checkoutKey: dto.checkoutKey } } });
    if (existing) return this.startPayment(existing.orderNumber, userId, existing.total, existing.currency);

    if (dto.fulfilmentType === 'DELIVERY' && !dto.address) {
      throw new AppException(400, 'VALIDATION_ERROR', 'Please review the highlighted fields.', [{ field: 'address', issue: 'Delivery address is required' }]);
    }
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const settings = await this.settings.get();
    const expiresAt = new Date(Date.now() + settings.paymentWindowMinutes * 60_000);

    let order;
    try {
      order = await serializable(this.prisma, async (tx) => {
        const { quote, lines, coupon, zone } = await this.buildQuote(tx, userId, dto, { region: dto.address?.region, area: dto.address?.area });
        if (dec(quote.total).lte(0)) throw new AppException(422, 'ORDER_TOTAL_ZERO', 'This order total is zero; contact us to complete it.');
        const returnDays = await Promise.all(lines.map((l) => this.settings.effectiveReturnDays(l.variant.product, tx)));

        const created = await tx.order.create({
          data: {
            orderNumber: orderNumber(),
            userId,
            checkoutKey: dto.checkoutKey,
            fulfilmentType: dto.fulfilmentType,
            currency: this.currency,
            subtotal: quote.subtotal,
            discountTotal: quote.discountTotal,
            taxTotal: quote.taxTotal,
            taxLines: quote.taxLines as unknown as Prisma.InputJsonValue,
            pricesIncludeTax: quote.pricesIncludeTax,
            deliveryFee: quote.deliveryFee,
            total: quote.total,
            couponCode: coupon?.code,
            deliveryZoneName: zone?.name,
            contactName: user.name,
            contactEmail: user.email,
            contactPhone: dto.contactPhone,
            shippingAddress: dto.fulfilmentType === 'DELIVERY' ? ({ ...dto.address } as Prisma.InputJsonValue) : Prisma.DbNull,
            notes: dto.notes,
            reservationExpiresAt: expiresAt,
            items: {
              create: lines.map((l, idx) => ({
                productId: l.variant.productId,
                variantId: l.variant.id,
                productName: l.variant.product.name,
                variantName: l.variant.name,
                sku: l.variant.sku,
                imageUrl: l.variant.product.images[0],
                unitPrice: l.unitPrice,
                quantity: l.quantity,
                lineTotal: quote.lines.find((q) => q.variantId === l.variant.id)!.lineTotal,
                returnWindowDays: returnDays[idx],
              })),
            },
            history: { create: { to: 'PENDING_PAYMENT', actorId: userId, note: 'Order placed' } },
          },
          include: { items: true },
        });

        await this.inventory.reserve(
          tx,
          created.id,
          lines.map((l) => ({ variantId: l.variant.id, quantity: l.quantity, name: l.variant.product.name })),
          expiresAt,
        );
        if (coupon) await this.coupons.redeem(tx, coupon, userId, created.id, quote.discountTotal);
        await this.notifier.placed(tx, created);
        return created;
      });
    } catch (e) {
      // A concurrent retry with the same checkoutKey won the race: return its order.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const dup = await this.prisma.order.findUnique({ where: { userId_checkoutKey: { userId, checkoutKey: dto.checkoutKey } } });
        if (dup) return this.startPayment(dup.orderNumber, userId, dup.total, dup.currency);
      }
      throw e;
    }

    return this.startPayment(order.orderNumber, userId, order.total, order.currency);
  }

  /** The order already exists; if the provider is down the customer can retry from the result page. */
  private async startPayment(orderNo: string, userId: string, total: Prisma.Decimal, currency: string): Promise<CreateOrderResult> {
    try {
      const payment = await this.payments.initiate(orderNo, userId);
      return { orderNumber: orderNo, total: money(total), currency, payment };
    } catch (e) {
      this.logger.error(`Payment initiation failed for ${orderNo}: ${e instanceof Error ? e.message : e}`);
      return { orderNumber: orderNo, total: money(total), currency, payment: null, paymentError: 'We could not start the payment. Try again from your order page.' };
    }
  }

  private async buildQuote(db: Tx | PrismaService, userId: string | null, dto: QuoteDto, where: { region?: string; area?: string }): Promise<BuiltQuote> {
    const merged = mergeLines(dto.lines);
    const variants = await db.productVariant.findMany({ where: { id: { in: merged.map((l) => l.variantId) } }, include: variantInclude });
    const byId = new Map(variants.map((v) => [v.id, v]));

    const lines = merged.map((l) => {
      const v = byId.get(l.variantId);
      if (!v || !v.isActive || v.product.status !== 'PUBLISHED') {
        throw new AppException(409, 'ITEM_UNAVAILABLE', 'An item in your cart is no longer available. Review your cart.', [{ field: l.variantId, issue: 'unavailable' }]);
      }
      if (dto.fulfilmentType === 'DELIVERY' && v.product.pickupOnly) {
        throw new AppException(422, 'PICKUP_ONLY_ITEM', `${v.product.name} is available for pickup only.`, [{ field: v.id, issue: 'pickup_only' }]);
      }
      if (available(v) < l.quantity) {
        throw new AppException(409, 'OUT_OF_STOCK', `${v.product.name} no longer has enough stock. Update your cart and try again.`, [{ field: v.id, issue: 'insufficient_stock' }]);
      }
      return { variant: v, quantity: l.quantity, unitPrice: variantPrice(v.product, v) };
    });

    let zone: DeliveryZone | null = null;
    let delivery: DeliveryRule | null = null;
    if (dto.fulfilmentType === 'DELIVERY') {
      zone = await this.findZone(db, where.region, where.area);
      delivery = {
        zoneName: zone.name,
        fee: dec(zone.fee),
        minimumOrder: zone.minimumOrder ? dec(zone.minimumOrder) : null,
        freeDeliveryThreshold: zone.freeDeliveryThreshold ? dec(zone.freeDeliveryThreshold) : null,
      };
    }

    const coupon = dto.couponCode ? await this.coupons.resolve(db, dto.couponCode, userId) : null;

    const settings = await this.settings.get();
    const quote = computeQuote({
      lines: lines.map((l) => ({
        variantId: l.variant.id,
        productId: l.variant.productId,
        categoryId: l.variant.product.categoryId,
        unitPrice: dec(l.unitPrice),
        quantity: l.quantity,
      })),
      coupon: coupon ? this.coupons.toRule(coupon) : null,
      delivery,
      taxes: await this.settings.activeTaxes(),
      pricesIncludeTax: settings.pricesIncludeTax,
    });
    return { quote, lines, coupon, zone };
  }

  /**
   * Area-specific zone in the region first, then the region's default zone.
   * Never guesses a fee: a region with no active zone is an explicit error (SRS 9.4).
   */
  private async findZone(db: Tx | PrismaService, region: string | undefined, area: string | undefined): Promise<DeliveryZone> {
    const zones = region ? await db.deliveryZone.findMany({ where: { isActive: true, region }, orderBy: { sortOrder: 'asc' } }) : [];
    const needle = area?.trim().toLowerCase();
    const zone =
      (needle ? zones.find((z) => z.areas.some((a) => a.toLowerCase() === needle)) : undefined) ??
      zones.find((z) => z.areas.length === 0);
    if (!zone) {
      throw new AppException(422, 'DELIVERY_AREA_UNSUPPORTED', 'Delivery to that region is not available right now. Choose pickup or message us on WhatsApp.', [{ field: 'deliveryRegion', issue: 'unsupported' }]);
    }
    return zone;
  }

  private get currency() {
    return this.config.get('CURRENCY', { infer: true });
  }
}

function mergeLines(lines: CartLineDto[]): CartLineDto[] {
  const m = new Map<string, number>();
  for (const l of lines) m.set(l.variantId, Math.min(99, (m.get(l.variantId) ?? 0) + l.quantity));
  return [...m.entries()].map(([variantId, quantity]) => ({ variantId, quantity }));
}
