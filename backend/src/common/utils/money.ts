import Decimal from 'decimal.js';

Decimal.set({ rounding: Decimal.ROUND_HALF_UP });

export type DecimalLike = Decimal | { toString(): string } | string | number;

export const dec = (v: DecimalLike | null | undefined): Decimal => new Decimal(v == null ? 0 : v.toString());
export const money = (v: DecimalLike): string => dec(v).toDecimalPlaces(2).toFixed(2);
export const ZERO = new Decimal(0);
export { Decimal };
