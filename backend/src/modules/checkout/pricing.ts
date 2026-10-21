import { AppException } from '../../common/app.exception';
import { Decimal, ZERO, dec, money } from '../../common/utils/money';

/**
 * Pure pricing engine. The backend is authoritative for every amount (SRS Appendix A).
 *
 * Calculation order:
 *   1. subtotal     = Σ round2(unitPrice × qty)
 *   2. discount     = coupon on the eligible subtotal (capped by maxDiscount and the eligible subtotal)
 *   3. deliveryFee  = zone fee; 0 for pickup or when (subtotal − discount) ≥ freeDeliveryThreshold
 *   4. tax lines    = each active tax, in order, on (subtotal − discount) [+ deliveryFee if appliesToDelivery]
 *        - prices EXCLUDE tax: amount = round2(base × rate), added to the total
 *        - prices INCLUDE tax: amount = round2(base × rate / (1 + Σ rates on that base)), shown but not added
 *   5. total        = subtotal − discount + deliveryFee (+ tax lines when prices exclude tax)
 *
 * Taxes are computed independently on the same base (no tax-on-tax). If your accountant
 * requires a compounding structure, change it here and add tests.
 */

export interface PricingLine {
  variantId: string;
  productId: string;
  categoryId: string;
  unitPrice: Decimal;
  quantity: number;
}

export interface CouponRule {
  code: string;
  discountType: 'PERCENT' | 'FIXED';
  value: Decimal;
  maxDiscount?: Decimal | null;
  minimumSpend?: Decimal | null;
  productIds: string[];
  categoryIds: string[];
}

export interface DeliveryRule {
  zoneName: string;
  fee: Decimal;
  minimumOrder?: Decimal | null;
  freeDeliveryThreshold?: Decimal | null;
}

export interface TaxRule {
  name: string;
  rate: Decimal; // fraction, 0.15 = 15%
  appliesToDelivery: boolean;
}

export interface QuoteInput {
  lines: PricingLine[];
  coupon?: CouponRule | null;
  delivery?: DeliveryRule | null; // null/undefined = pickup
  taxes: TaxRule[];
  pricesIncludeTax: boolean;
}

export interface TaxLine {
  name: string;
  ratePercent: string;
  amount: string;
}

export interface Quote {
  lines: { variantId: string; unitPrice: string; quantity: number; lineTotal: string }[];
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  taxLines: TaxLine[];
  pricesIncludeTax: boolean;
  deliveryFee: string;
  total: string;
  couponCode: string | null;
  freeDeliveryApplied: boolean;
  amountToFreeDelivery: string | null;
}

const r2 = (d: Decimal) => d.toDecimalPlaces(2);

export function computeQuote(input: QuoteInput): Quote {
  if (!input.lines.length) throw new AppException(400, 'CART_EMPTY', 'Your cart is empty.');

  const lineTotals = input.lines.map((l) => ({ line: l, total: r2(l.unitPrice.mul(l.quantity)) }));
  const subtotal = lineTotals.reduce((acc, x) => acc.add(x.total), ZERO);

  let discount = ZERO;
  const c = input.coupon;
  if (c) {
    if (c.minimumSpend && subtotal.lt(c.minimumSpend)) {
      throw new AppException(422, 'COUPON_MINIMUM_NOT_MET', `Spend at least ${money(c.minimumSpend)} to use ${c.code}.`);
    }
    const restricted = c.productIds.length > 0 || c.categoryIds.length > 0;
    const eligible = lineTotals
      .filter(({ line }) => !restricted || c.productIds.includes(line.productId) || c.categoryIds.includes(line.categoryId))
      .reduce((acc, x) => acc.add(x.total), ZERO);
    if (eligible.isZero()) {
      throw new AppException(422, 'COUPON_NOT_APPLICABLE', `${c.code} does not apply to the items in your cart.`);
    }
    discount = c.discountType === 'PERCENT' ? r2(eligible.mul(Decimal.min(c.value, 100)).div(100)) : r2(c.value);
    if (c.maxDiscount) discount = Decimal.min(discount, c.maxDiscount);
    discount = Decimal.min(discount, eligible);
  }

  const afterDiscount = subtotal.sub(discount);

  let deliveryFee = ZERO;
  let freeDeliveryApplied = false;
  let amountToFreeDelivery: Decimal | null = null;
  const d = input.delivery;
  if (d) {
    if (d.minimumOrder && afterDiscount.lt(d.minimumOrder)) {
      throw new AppException(422, 'DELIVERY_MINIMUM_NOT_MET', `Delivery to ${d.zoneName} needs a minimum order of ${money(d.minimumOrder)}.`);
    }
    if (d.freeDeliveryThreshold && afterDiscount.gte(d.freeDeliveryThreshold)) {
      freeDeliveryApplied = true;
    } else {
      deliveryFee = r2(d.fee);
      if (d.freeDeliveryThreshold) amountToFreeDelivery = d.freeDeliveryThreshold.sub(afterDiscount);
    }
  }

  const { lines: taxLines, total: tax } = computeTaxes(input.taxes, afterDiscount, deliveryFee, input.pricesIncludeTax);
  const total = afterDiscount.add(deliveryFee).add(input.pricesIncludeTax ? ZERO : tax);

  return {
    lines: lineTotals.map(({ line, total: t }) => ({ variantId: line.variantId, unitPrice: money(line.unitPrice), quantity: line.quantity, lineTotal: money(t) })),
    subtotal: money(subtotal),
    discountTotal: money(discount),
    taxTotal: money(tax),
    taxLines,
    pricesIncludeTax: input.pricesIncludeTax,
    deliveryFee: money(deliveryFee),
    total: money(total),
    couponCode: c?.code ?? null,
    freeDeliveryApplied,
    amountToFreeDelivery: amountToFreeDelivery ? money(amountToFreeDelivery) : null,
  };
}

function computeTaxes(taxes: TaxRule[], goods: Decimal, delivery: Decimal, inclusive: boolean) {
  const goodsRateSum = taxes.reduce((a, t) => a.add(t.rate), ZERO);
  const deliveryRateSum = taxes.filter((t) => t.appliesToDelivery).reduce((a, t) => a.add(t.rate), ZERO);
  let total = ZERO;
  const lines = taxes.map((t) => {
    let amount: Decimal;
    if (inclusive) {
      const onGoods = goods.mul(t.rate).div(goodsRateSum.add(1));
      const onDelivery = t.appliesToDelivery ? delivery.mul(t.rate).div(deliveryRateSum.add(1)) : ZERO;
      amount = r2(onGoods.add(onDelivery));
    } else {
      amount = r2(goods.add(t.appliesToDelivery ? delivery : ZERO).mul(t.rate));
    }
    total = total.add(amount);
    return { name: t.name, ratePercent: t.rate.mul(100).toDecimalPlaces(2).toString(), amount: money(amount) };
  });
  return { lines, total };
}

export { dec };
