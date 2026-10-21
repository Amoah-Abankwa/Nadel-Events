import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsNumberString, IsOptional,
  IsString, IsUrl, IsUUID, Length, Matches, Max, MaxLength, Min, NotEquals, ValidateIf, ValidateNested,
} from 'class-validator';
import { PageQuery } from '../../common/utils/pagination';
import { STAFF_SETTABLE } from '../orders/order-state';
import { GHANA_REGIONS } from '../../common/ghana';
import { MONEY_RE } from '../../common/validation';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const upper = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toUpperCase() : value);

export class VariantInput {
  @IsString() @Length(1, 60) name: string;
  @IsString() @Length(2, 60) sku: string;
  @IsOptional() @Matches(MONEY_RE) price?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) stockOnHand?: number;
  @IsOptional() @IsBoolean() trackStock?: boolean;
}

export class SpecRowDto {
  @IsOptional() @IsString() @MaxLength(40) group?: string;
  @IsString() @Length(1, 60) name: string;
  @IsString() @Length(1, 200) value: string;
}

export class CreateProductDto {
  @IsString() @Length(2, 120) name: string;
  @Matches(SLUG, { message: 'Use lowercase letters, numbers and hyphens' }) @Length(2, 120) slug: string;
  @IsString() @MaxLength(10_000) description: string;
  @IsString() categoryId: string;
  @IsOptional() @IsString() @MaxLength(60) brand?: string;
  @Matches(MONEY_RE) basePrice: string;
  @IsOptional() @Matches(MONEY_RE) compareAtPrice?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(12) @IsUrl({ protocols: ['https'] }, { each: true }) images?: string[];
  @IsOptional() @IsIn(['DRAFT', 'PUBLISHED']) status?: 'DRAFT' | 'PUBLISHED';
  @IsOptional() @IsBoolean() isFeatured?: boolean;
  @IsOptional() @IsBoolean() pickupOnly?: boolean;
  /** Working days; omit for the store default, 0 = not returnable (e.g. custom cakes). */
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(60) returnWindowDays?: number;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => VariantInput) variants: VariantInput[];
  /** Specification tab rows, e.g. { group: "Size", name: "Diameter", value: "23 cm" }. */
  @IsOptional() @IsArray() @ArrayMaxSize(40) @ValidateNested({ each: true }) @Type(() => SpecRowDto) specs?: SpecRowDto[];
}

export class UpdateProductDto {
  @IsOptional() @IsString() @Length(2, 120) name?: string;
  @IsOptional() @IsString() @MaxLength(10_000) description?: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() @MaxLength(60) brand?: string | null;
  @IsOptional() @Matches(MONEY_RE) basePrice?: string;
  @IsOptional() @Matches(MONEY_RE) compareAtPrice?: string | null;
  @IsOptional() @IsArray() @ArrayMaxSize(12) @IsUrl({ protocols: ['https'] }, { each: true }) images?: string[];
  @IsOptional() @IsIn(['DRAFT', 'PUBLISHED', 'ARCHIVED']) status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  @IsOptional() @IsBoolean() isFeatured?: boolean;
  @IsOptional() @IsBoolean() pickupOnly?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(60) returnWindowDays?: number | null;
  @IsOptional() @IsArray() @ArrayMaxSize(40) @ValidateNested({ each: true }) @Type(() => SpecRowDto) specs?: SpecRowDto[];
}

export class VariantUpdateDto {
  @IsOptional() @IsString() @Length(1, 60) name?: string;
  @IsOptional() @IsString() @Length(2, 60) sku?: string;
  /** null = use the product's base price. */
  @IsOptional() @ValidateIf((_, v) => v !== null) @Matches(MONEY_RE) price?: string | null;
  @IsOptional() @IsBoolean() trackStock?: boolean;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() sortOrder?: number;
}

export class StockAdjustDto {
  @Type(() => Number) @IsInt() @Min(-100_000) @Max(100_000) @NotEquals(0) delta: number;
  @IsOptional() @IsString() @MaxLength(200) note?: string;
}

export class AdminProductQuery extends PageQuery {
  @IsOptional() @IsString() @MaxLength(100) q?: string;
  @IsOptional() @IsIn(['DRAFT', 'PUBLISHED', 'ARCHIVED']) status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  @IsOptional() @IsIn(['1']) lowStock?: '1';
}

export class AdminOrderQuery extends PageQuery {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() paymentStatus?: string;
  @IsOptional() @IsIn(['PICKUP', 'DELIVERY']) fulfilmentType?: 'PICKUP' | 'DELIVERY';
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @Transform(({ value }) => value === 'true') @IsBoolean() needsReconciliation?: boolean;
  @IsOptional() @IsString() @MaxLength(40) q?: string;
}

export class RestockLineDto {
  @IsString() variantId: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(999) quantity: number;
}

export class RefundDto {
  @Matches(MONEY_RE, { message: 'Enter an amount like 50 or 50.25' }) amount: string;
  @IsString() @Length(3, 300) reason: string;
  @IsIn(['PROVIDER', 'MANUAL']) method: 'PROVIDER' | 'MANUAL';
  @IsOptional() @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => RestockLineDto) restock?: RestockLineDto[];
  @IsUUID() idempotencyKey: string;
}

export class OrderStatusDto {
  @IsIn(STAFF_SETTABLE) status: (typeof STAFF_SETTABLE)[number];
  @IsOptional() @IsString() @MaxLength(300) note?: string;
}

export class DeliveryZoneDto {
  @IsString() @Length(2, 80) name: string;
  @IsIn(GHANA_REGIONS) region: string;
  /** Leave empty for the region-wide default rate. */
  @IsArray() @IsString({ each: true }) areas: string[];
  @IsOptional() @IsString() @MaxLength(60) leadTime?: string;
  @Matches(MONEY_RE) fee: string;
  @IsOptional() @Matches(MONEY_RE) minimumOrder?: string;
  @IsOptional() @Matches(MONEY_RE) freeDeliveryThreshold?: string;
  @IsOptional() @IsString() @MaxLength(120) serviceHours?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() sortOrder?: number;
}

export class CouponDto {
  @Transform(upper) @Matches(/^[A-Z0-9_-]{3,32}$/) code: string;
  @IsOptional() @IsString() @MaxLength(200) description?: string;
  @IsIn(['PERCENT', 'FIXED']) discountType: 'PERCENT' | 'FIXED';
  @IsNumberString() value: string;
  @IsOptional() @Matches(MONEY_RE) maxDiscount?: string;
  @IsOptional() @Matches(MONEY_RE) minimumSpend?: string;
  @IsOptional() @IsDateString() startsAt?: string;
  @IsOptional() @IsDateString() endsAt?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) maxUses?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) perUserLimit?: number;
  @IsOptional() @IsBoolean() firstOrderOnly?: boolean;
  @IsOptional() @IsArray() @IsString({ each: true }) productIds?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) categoryIds?: string[];
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class OutboxQuery extends PageQuery {
  @IsOptional() @IsIn(['PENDING', 'PROCESSING', 'SENT', 'DEAD']) status?: 'PENDING' | 'PROCESSING' | 'SENT' | 'DEAD';
}
