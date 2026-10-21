import Decimal from 'decimal.js';
import { computeQuote, type PricingLine } from '../src/modules/checkout/pricing';

const line = (over: Partial<PricingLine> = {}): PricingLine => ({
  variantId: 'v1',
  productId: 'p1',
  categoryId: 'c1',
  unitPrice: new Decimal('19.99'),
  quantity: 3,
  ...over,
});

describe('computeQuote', () => {
  it('pickup has no delivery fee and totals exactly', () => {
    const q = computeQuote({ lines: [line()], taxes: [], pricesIncludeTax: false });
    expect(q).toMatchObject({ subtotal: '59.97', discountTotal: '0.00', deliveryFee: '0.00', total: '59.97' });
  });

  it('applies zone delivery fee', () => {
    const q = computeQuote({ lines: [line()], delivery: { zoneName: 'Central', fee: new Decimal(25) }, taxes: [], pricesIncludeTax: false });
    expect(q.deliveryFee).toBe('25.00');
    expect(q.total).toBe('84.97');
  });

  it('waives delivery at the free threshold, measured after discount', () => {
    const delivery = { zoneName: 'Central', fee: new Decimal(25), freeDeliveryThreshold: new Decimal(100) };
    const coupon = { code: 'TEN', discountType: 'FIXED' as const, value: new Decimal(10), productIds: [], categoryIds: [] };
    const q = computeQuote({ lines: [line({ unitPrice: new Decimal(105), quantity: 1 })], coupon, delivery, taxes: [], pricesIncludeTax: false });
    expect(q.freeDeliveryApplied).toBe(false); // 95 after discount
    expect(q.deliveryFee).toBe('25.00');
    expect(q.amountToFreeDelivery).toBe('5.00');
  });

  it('caps percent discount by maxDiscount', () => {
    const coupon = { code: 'HALF', discountType: 'PERCENT' as const, value: new Decimal(50), maxDiscount: new Decimal(20), productIds: [], categoryIds: [] };
    const q = computeQuote({ lines: [line({ unitPrice: new Decimal(100), quantity: 1 })], coupon, taxes: [], pricesIncludeTax: false });
    expect(q.discountTotal).toBe('20.00');
    expect(q.total).toBe('80.00');
  });

  it('restricts a coupon to eligible categories only', () => {
    const coupon = { code: 'DECOR', discountType: 'PERCENT' as const, value: new Decimal(10), productIds: [], categoryIds: ['decor'] };
    const q = computeQuote({
      lines: [line({ unitPrice: new Decimal(100), quantity: 1 }), line({ variantId: 'v2', categoryId: 'decor', unitPrice: new Decimal(50), quantity: 1 })],
      coupon,
      taxes: [],
      pricesIncludeTax: false,
    });
    expect(q.discountTotal).toBe('5.00');
  });

  it('never discounts more than the eligible subtotal', () => {
    const coupon = { code: 'BIG', discountType: 'FIXED' as const, value: new Decimal(500), productIds: [], categoryIds: [] };
    const q = computeQuote({ lines: [line({ unitPrice: new Decimal(40), quantity: 1 })], coupon, taxes: [], pricesIncludeTax: false });
    expect(q.discountTotal).toBe('40.00');
    expect(q.total).toBe('0.00');
  });

  it('rejects coupon below minimum spend', () => {
    const coupon = { code: 'MIN', discountType: 'FIXED' as const, value: new Decimal(5), minimumSpend: new Decimal(100), productIds: [], categoryIds: [] };
    expect(() => computeQuote({ lines: [line()], coupon, taxes: [], pricesIncludeTax: false })).toThrow(/at least/);
  });

  it('rejects delivery below zone minimum', () => {
    const delivery = { zoneName: 'Greater', fee: new Decimal(40), minimumOrder: new Decimal(100) };
    expect(() => computeQuote({ lines: [line()], delivery, taxes: [], pricesIncludeTax: false })).toThrow(/minimum order/);
  });

  const VAT = { name: 'VAT', rate: new Decimal('0.15'), appliesToDelivery: false };
  const LEVY = { name: 'Levy', rate: new Decimal('0.05'), appliesToDelivery: true };
  const oneItem = [line({ unitPrice: new Decimal(100), quantity: 1 })];
  const delivery = { zoneName: 'Ashanti', fee: new Decimal(20) };

  it('adds tax lines on top when prices exclude tax', () => {
    const q = computeQuote({ lines: oneItem, delivery, taxes: [VAT, LEVY], pricesIncludeTax: false });
    expect(q.taxLines).toEqual([
      { name: 'VAT', ratePercent: '15', amount: '15.00' }, // goods only
      { name: 'Levy', ratePercent: '5', amount: '6.00' }, // goods + delivery
    ]);
    expect(q.taxTotal).toBe('21.00');
    expect(q.total).toBe('141.00');
  });

  it('extracts included tax without changing the total when prices include tax', () => {
    const q = computeQuote({ lines: [line({ unitPrice: new Decimal(115), quantity: 1 })], taxes: [VAT], pricesIncludeTax: true });
    expect(q.taxTotal).toBe('15.00');
    expect(q.total).toBe('115.00');
  });

  it('taxes the discounted subtotal, not the list price', () => {
    const coupon = { code: 'TEN', discountType: 'FIXED' as const, value: new Decimal(10), productIds: [], categoryIds: [] };
    const q = computeQuote({ lines: oneItem, coupon, taxes: [VAT], pricesIncludeTax: false });
    expect(q.taxTotal).toBe('13.50');
    expect(q.total).toBe('103.50');
  });

  it('avoids floating-point drift', () => {
    const q = computeQuote({ lines: [line({ unitPrice: new Decimal('0.1'), quantity: 3 })], taxes: [], pricesIncludeTax: false });
    expect(q.subtotal).toBe('0.30');
  });
});
